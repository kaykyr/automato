import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from '../providers/playwright/playwright.service';
import { Page } from 'playwright';
import { Flow } from './entities/flow.entity';
import { FlowExecution } from './entities/flow-execution.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlowWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class FlowExecutorService {
  private readonly logger = new Logger(FlowExecutorService.name);
  private readonly runningExecutions = new Map<string, boolean>();
  private readonly executionBrowsers = new Map<string, { page: Page; browser: any }>();

  constructor(
    private readonly playwrightService: PlaywrightService,
    @InjectRepository(FlowExecution)
    private readonly executionRepository: Repository<FlowExecution>,
    private readonly webSocketGateway: FlowWebSocketGateway,
  ) {}

  async executeFlow(flow: Flow, execution: FlowExecution, variables: Record<string, any> = {}) {
    const browserSettings = flow.browserSettings || {};
    const pageInfo = await this.playwrightService.createPage(browserSettings);
    const page = 'page' in pageInfo ? pageInfo.page : pageInfo;
    const browser = 'browser' in pageInfo ? pageInfo.browser : null;
    const executionVariables = { ...flow.variables, ...variables };
    const executionLog = [];

    try {
      // Mark execution as running
      this.runningExecutions.set(execution.id, true);
      
      // Store browser info for cleanup
      if (browser) {
        this.executionBrowsers.set(execution.id, { page, browser });
      }
      
      execution.status = 'running';
      await this.executionRepository.save(execution);

      // Emit execution started
      this.webSocketGateway.emitExecutionStatus(execution.id, flow.id, {
        status: 'running',
        startedAt: new Date().toISOString(),
      });

      // Execute nodes following the flow logic
      await this.executeFlowNodes(flow.nodes, flow.edges, page, executionVariables, executionLog, execution);
      
      // Instead of topological sort, we'll use a graph traversal approach
      // const sortedNodes = this.topologicalSort(flow.nodes, flow.edges);

      // for (const node of sortedNodes) {
      //   execution.currentNode = node.id;
      //   await this.executionRepository.save(execution);

      //   const result = await this.executeNode(page, node, executionVariables);
        
      //   executionLog.push({
      //     nodeId: node.id,
      //     nodeName: node.data.label,
      //     action: node.data.action,
      //     result,
      //     timestamp: new Date(),
      //   });

      //   if (result.error) {
      //     throw new Error(`Node ${node.id} failed: ${result.error}`);
      //   }

      //   // Update variables if node sets any
      //   if (result.variable) {
      //     executionVariables[result.variable.name] = result.variable.value;
      //   }
      // }

      // Check if execution was stopped
      if (!this.runningExecutions.get(execution.id)) {
        execution.status = 'cancelled';
        execution.error = 'Execution cancelled by user';
        execution.completedAt = new Date();
        execution.executionLog = executionLog;
        await this.executionRepository.save(execution);

        // Emit execution cancelled
        this.webSocketGateway.emitExecutionError(execution.id, flow.id, {
          status: 'cancelled',
          error: 'Execution cancelled by user',
          completedAt: execution.completedAt.toISOString(),
          executionLog,
        });

        return execution;
      }

      execution.status = 'completed';
      execution.results = executionVariables;
      execution.completedAt = new Date();
      execution.executionLog = executionLog;
      await this.executionRepository.save(execution);

      // Emit execution completed
      this.webSocketGateway.emitExecutionComplete(execution.id, flow.id, {
        status: 'completed',
        results: executionVariables,
        completedAt: execution.completedAt.toISOString(),
        executionLog,
      });

      return execution;
    } catch (error) {
      this.logger.error(`Flow execution failed: ${error.message}`);
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      execution.executionLog = executionLog;
      await this.executionRepository.save(execution);

      // Emit execution error
      this.webSocketGateway.emitExecutionError(execution.id, flow.id, {
        status: 'failed',
        error: error.message,
        completedAt: execution.completedAt.toISOString(),
        executionLog,
      });

      throw error;
    } finally {
      // Clean up running execution marker
      this.runningExecutions.delete(execution.id);
      
      // Clean up browser resources
      await this.cleanupExecution(execution.id, browserSettings.keepOpen);
    }
  }

  private async executeNode(page: Page, node: any, variables: Record<string, any>, execution?: FlowExecution) {
    const config = node.data.config || {};
    const action = node.data.action;
    
    // Set contextual input data for the node
    const inputVariableName = `${node.id}_input`;
    const currentInput = variables['currentInput'];
    
    // Make input data available to the node
    if (currentInput !== undefined) {
      variables[inputVariableName] = currentInput;
    }

    try {
      switch (action) {
        case 'navigate':
          // Support both direct URL and variable-based URL
          let url = '';
          if (config.navigate?.urlVariable && variables[config.navigate.urlVariable]) {
            const urlValue = variables[config.navigate.urlVariable];
            // If it's an array, take the first element (this shouldn't happen in loop context)
            url = Array.isArray(urlValue) ? String(urlValue[0]) : String(urlValue);
          } else {
            url = this.interpolateVariables(config.navigate?.url || '', variables);
          }
          
          // Additional debug logging
          console.log(`🧭 Navigate node attempting to go to: ${url}`);
          console.log(`📋 Current variables:`, Object.keys(variables).reduce((acc, key) => {
            acc[key] = Array.isArray(variables[key]) ? `[Array of ${variables[key].length}]` : variables[key];
            return acc;
          }, {}));
          
          const waitUntil = config.navigate?.waitUntil || 'networkidle';
          await page.goto(url, { waitUntil });
          return { success: true, url, waitUntil };

        case 'click':
          const clickSelector = this.interpolateVariables(config.click?.selector || '', variables);
          if (config.click?.waitBefore) {
            const waitBefore = parseInt(String(config.click.waitBefore)) || 0;
            await page.waitForTimeout(waitBefore);
          }
          await page.click(clickSelector);
          return { success: true, selector: clickSelector };

        case 'type':
          const typeSelector = this.interpolateVariables(config.type?.selector || '', variables);
          
          // Support both direct text and variable-based text
          let text = '';
          if (config.type?.textVariable && variables[config.type.textVariable]) {
            text = String(variables[config.type.textVariable]);
          } else {
            text = this.interpolateVariables(config.type?.text || '', variables);
          }
          
          if (config.type?.clear) {
            await page.fill(typeSelector, '');
          }
          const typeDelay = parseInt(String(config.type?.delay)) || 0;
          await page.type(typeSelector, text, { delay: typeDelay });
          return { success: true, selector: typeSelector, text };

        case 'waitFor':
          const waitSelector = this.interpolateVariables(config.waitFor?.selector || '', variables);
          await page.waitForSelector(waitSelector, {
            state: config.waitFor?.state || 'visible',
            timeout: parseInt(String(config.waitFor?.timeout)) || 30000,
          });
          return { success: true, selector: waitSelector };

        case 'scroll':
          if (config.scroll?.selector) {
            const scrollSelector = this.interpolateVariables(config.scroll.selector, variables);
            const element = await page.$(scrollSelector);
            if (element) {
              await element.scrollIntoViewIfNeeded();
            }
          } else {
            const amount = config.scroll?.amount || 300;
            const direction = config.scroll?.direction || 'down';
            const scrollY = direction === 'down' ? amount : -amount;
            await page.evaluate((y) => window.scrollBy(0, y), scrollY);
          }
          return { success: true };

        case 'extractText':
          const textSelector = this.interpolateVariables(config.extractText?.selector || '', variables);
          let textContent;
          if (config.extractText?.multiple) {
            textContent = await page.$$eval(textSelector, elements => 
              elements.map(el => el.textContent?.trim())
            );
          } else {
            textContent = await page.$eval(textSelector, el => el.textContent?.trim());
          }
          return {
            success: true,
            variable: {
              name: config.extractText?.variableName,
              value: textContent,
            },
          };

        case 'extractHtml':
          const htmlSelector = this.interpolateVariables(config.extractHtml?.selector || '', variables);
          const htmlContent = await page.$eval(htmlSelector, el => el.innerHTML);
          return {
            success: true,
            variable: {
              name: config.extractHtml?.variableName,
              value: htmlContent,
            },
          };

        case 'extractAttribute':
          const attrSelector = this.interpolateVariables(config.extractAttribute?.selector || '', variables);
          const attribute = config.extractAttribute?.attribute || '';
          const attrValue = await page.$eval(attrSelector, (el, attr) => el.getAttribute(attr), attribute);
          return {
            success: true,
            variable: {
              name: config.extractAttribute?.variableName,
              value: attrValue,
            },
          };

        case 'screenshot':
          const screenshotOptions: any = {};
          if (config.screenshot?.selector) {
            const screenshotSelector = this.interpolateVariables(config.screenshot.selector, variables);
            const element = await page.$(screenshotSelector);
            if (element) {
              const screenshot = await element.screenshot();
              return {
                success: true,
                variable: {
                  name: config.screenshot?.variableName,
                  value: screenshot.toString('base64'),
                },
              };
            }
          } else {
            screenshotOptions.fullPage = config.screenshot?.fullPage || false;
            const screenshot = await page.screenshot(screenshotOptions);
            return {
              success: true,
              variable: {
                name: config.screenshot?.variableName,
                value: screenshot.toString('base64'),
              },
            };
          }
          break;

        case 'waitTime':
          const duration = parseInt(String(config.waitTime?.duration)) || 1000;
          await page.waitForTimeout(duration);
          return { success: true };

        case 'setVariable':
          // Support both direct value and variable-based value
          let value: any = '';
          if (config.setVariable?.fromVariable && variables[config.setVariable.fromVariable]) {
            value = variables[config.setVariable.fromVariable];
          } else {
            value = this.interpolateVariables(config.setVariable?.value || '', variables);
          }
          
          return {
            success: true,
            variable: {
              name: config.setVariable?.name,
              value,
            },
          };

        case 'condition':
          const conditionType = config.condition?.type || 'exists';
          const conditionSelector = this.interpolateVariables(config.condition?.selector || '', variables);
          const conditionValue = this.interpolateVariables(config.condition?.value || '', variables);
          const conditionVariable = config.condition?.variable;
          let conditionResult = false;

          if (conditionVariable && variables[conditionVariable] !== undefined) {
            // Check variable condition
            const varValue = String(variables[conditionVariable]);
            switch (conditionType) {
              case 'equals':
                conditionResult = varValue === conditionValue;
                break;
              case 'contains':
                conditionResult = varValue.includes(conditionValue);
                break;
              case 'regex':
                conditionResult = new RegExp(conditionValue).test(varValue);
                break;
              default:
                conditionResult = !!variables[conditionVariable];
            }
          } else if (conditionSelector) {
            // Check element condition
            try {
              switch (conditionType) {
                case 'exists':
                  await page.waitForSelector(conditionSelector, { timeout: 5000 });
                  conditionResult = true;
                  break;
                case 'contains':
                  const elementText = await page.$eval(conditionSelector, el => el.textContent || '');
                  conditionResult = elementText.includes(conditionValue);
                  break;
                case 'equals':
                  const elementTextEquals = await page.$eval(conditionSelector, el => el.textContent || '');
                  conditionResult = elementTextEquals.trim() === conditionValue;
                  break;
                case 'regex':
                  const elementTextRegex = await page.$eval(conditionSelector, el => el.textContent || '');
                  conditionResult = new RegExp(conditionValue).test(elementTextRegex);
                  break;
              }
            } catch (error) {
              conditionResult = false;
            }
          }

          return {
            success: true,
            condition: conditionResult,
            nextHandle: conditionResult ? 'true' : 'false',
          };

        case 'isVisible':
          const visibilitySelector = this.interpolateVariables(config.isVisible?.selector || '', variables);
          const timeout = parseInt(String(config.isVisible?.timeout)) || 5000;
          const variableName = config.isVisible?.variableName;
          let isVisible = false;
          
          try {
            // Try to find the element and check if it's visible
            await page.waitForSelector(visibilitySelector, { 
              state: 'visible', 
              timeout 
            });
            isVisible = true;
          } catch (error) {
            // If element is not visible within timeout, check if it exists but is hidden
            try {
              await page.waitForSelector(visibilitySelector, { 
                state: 'attached', 
                timeout: 1000 
              });
              isVisible = false; // Element exists but is not visible
            } catch (innerError) {
              isVisible = false; // Element doesn't exist
            }
          }
          
          const result: any = {
            success: true,
            condition: isVisible,
            nextHandle: isVisible ? 'true' : 'false',
          };
          
          // If variable name is provided, store the result in a variable
          if (variableName) {
            result.variable = {
              name: variableName,
              value: isVisible,
            };
          }
          
          return result;

        case 'hover':
          const hoverSelector = this.interpolateVariables(config.hover?.selector || '', variables);
          await page.hover(hoverSelector);
          if (config.hover?.duration) {
            const hoverDuration = parseInt(String(config.hover.duration)) || 0;
            await page.waitForTimeout(hoverDuration);
          }
          return { success: true, selector: hoverSelector };

        case 'selectOption':
          const selectSelector = this.interpolateVariables(config.selectOption?.selector || '', variables);
          if (config.selectOption?.value) {
            const optionValue = this.interpolateVariables(config.selectOption.value, variables);
            await page.selectOption(selectSelector, optionValue);
          } else if (config.selectOption?.text) {
            const optionText = this.interpolateVariables(config.selectOption.text, variables);
            await page.selectOption(selectSelector, { label: optionText });
          }
          return { success: true, selector: selectSelector };

        case 'checkBox':
          const checkboxSelector = this.interpolateVariables(config.checkBox?.selector || '', variables);
          const action = config.checkBox?.action || 'check';
          
          if (action === 'check') {
            await page.check(checkboxSelector);
          } else if (action === 'uncheck') {
            await page.uncheck(checkboxSelector);
          } else if (action === 'toggle') {
            const isChecked = await page.isChecked(checkboxSelector);
            if (isChecked) {
              await page.uncheck(checkboxSelector);
            } else {
              await page.check(checkboxSelector);
            }
          }
          return { success: true, selector: checkboxSelector, action };

        case 'keyPress':
          const keys = config.keyPress?.keys || '';
          const modifiers = config.keyPress?.modifiers || [];
          
          if (modifiers.length > 0) {
            await page.keyboard.press(`${modifiers.join('+')}+${keys}`);
          } else {
            await page.keyboard.press(keys);
          }
          return { success: true, keys, modifiers };

        case 'iframe':
          const iframeAction = config.iframe?.action || 'enter';
          
          if (iframeAction === 'enter') {
            const iframeSelector = this.interpolateVariables(config.iframe?.selector || '', variables);
            const frameHandle = await page.$(iframeSelector);
            if (frameHandle) {
              const frame = await frameHandle.contentFrame();
              if (frame) {
                // Store frame reference for subsequent operations
                // Note: This is a simplified implementation
                return { success: true, action: 'entered', selector: iframeSelector };
              }
            }
          } else if (iframeAction === 'exit') {
            // Exit iframe context - return to main page
            return { success: true, action: 'exited' };
          }
          return { success: true, action: iframeAction };

        case 'download':
          const downloadSelector = this.interpolateVariables(config.download?.selector || '', variables);
          const downloadPromise = page.waitForEvent('download');
          await page.click(downloadSelector);
          const download = await downloadPromise;
          
          const filename = config.download?.filename || download.suggestedFilename();
          const downloadPath = `/tmp/${filename}`;
          await download.saveAs(downloadPath);
          
          return {
            success: true,
            variable: {
              name: config.download?.variableName,
              value: downloadPath,
            },
          };

        case 'uploadFile':
          const uploadSelector = this.interpolateVariables(config.uploadFile?.selector || '', variables);
          const filePath = this.interpolateVariables(config.uploadFile?.filePath || '', variables);
          
          await page.setInputFiles(uploadSelector, filePath);
          return { success: true, selector: uploadSelector, filePath };

        case 'clearCookies':
          const domain = config.clearCookies?.domain;
          if (domain) {
            await page.context().clearCookies({ domain });
          } else {
            await page.context().clearCookies();
          }
          return { success: true, domain };

        case 'setCookie':
          const cookieName = config.setCookie?.name || '';
          const cookieValue = this.interpolateVariables(config.setCookie?.value || '', variables);
          const cookieDomain = config.setCookie?.domain || new URL(page.url()).hostname;
          const cookiePath = config.setCookie?.path || '/';
          
          await page.context().addCookies([{
            name: cookieName,
            value: cookieValue,
            domain: cookieDomain,
            path: cookiePath,
          }]);
          return { success: true, name: cookieName, value: cookieValue };

        case 'alert':
          const alertAction = config.alert?.action || 'accept';
          
          // Set up alert handler
          page.once('dialog', async dialog => {
            if (alertAction === 'accept') {
              const text = config.alert?.text || '';
              await dialog.accept(text);
            } else if (alertAction === 'dismiss') {
              await dialog.dismiss();
            } else if (alertAction === 'getText') {
              const alertText = dialog.message();
              await dialog.accept();
              return {
                success: true,
                variable: {
                  name: config.alert?.variableName,
                  value: alertText,
                },
              };
            }
          });
          
          return { success: true, action: alertAction };

        case 'regex':
          const regexConfig = config.regex;
          let inputText = '';
          
          // Get input text based on source
          if (regexConfig?.source === 'variable') {
            const variableName = regexConfig.variableName || '';
            inputText = variables[variableName] || '';
          } else if (regexConfig?.source === 'element') {
            const regexSelector = this.interpolateVariables(regexConfig.selector || '', variables);
            inputText = await page.$eval(regexSelector, el => el.textContent || '').catch(() => '');
          } else if (regexConfig?.source === 'text') {
            inputText = regexConfig.text || '';
          }
          
          // Process with regex
          const pattern = regexConfig?.pattern || '';
          const flags = regexConfig?.flags || '';
          const operation = regexConfig?.operation || 'match';
          const matchAll = regexConfig?.matchAll || false;
          
          let regexResult: any = null;
          
          try {
            const regex = new RegExp(pattern, flags);
            
            switch (operation) {
              case 'match':
                regexResult = matchAll ? inputText.match(regex) : inputText.match(regex);
                break;
              case 'extract':
                const matches = matchAll ? [...inputText.matchAll(new RegExp(pattern, flags + 'g'))] : [inputText.match(regex)];
                regexResult = matches.filter(match => match).map(match => match?.slice(1) || []);
                break;
              case 'replace':
                const replacement = regexConfig?.replacement || '';
                regexResult = inputText.replace(matchAll ? new RegExp(pattern, flags + 'g') : regex, replacement);
                break;
              case 'test':
                regexResult = regex.test(inputText);
                break;
              default:
                regexResult = null;
            }
          } catch (error) {
            return { success: false, error: `Regex error: ${error.message}` };
          }
          
          return {
            success: true,
            variable: {
              name: regexConfig?.outputVariable || 'regexResult',
              value: regexResult,
            },
          };

        case 'extractUrls':
          const extractUrlsConfig = config.extractUrls;
          const urlSelector = this.interpolateVariables(extractUrlsConfig?.selector || 'body', variables);
          const includeRelative = extractUrlsConfig?.includeRelative !== false;
          const includeEmpty = extractUrlsConfig?.includeEmpty || false;
          const filterDuplicates = extractUrlsConfig?.filterDuplicates !== false;
          const baseUrl = extractUrlsConfig?.baseUrl || '';
          
          try {
            // First, check if the selector matches any elements
            const elementsCount = await page.$$eval(urlSelector, (elements) => elements.length);
            if (elementsCount === 0) {
              console.log(`⚠️  No elements found with selector: ${urlSelector}`);
              return {
                success: true,
                variable: {
                  name: extractUrlsConfig?.variableName || 'extractedUrls',
                  value: [],
                },
              };
            }
            
            // Check if there are any anchor tags within the selector
            const anchorsCount = await page.$$eval(`${urlSelector} a`, (links) => links.length);
            console.log(`🔍 Found ${elementsCount} elements with selector "${urlSelector}"`);
            console.log(`🔗 Found ${anchorsCount} anchor tags within selector`);
            
            // Extract all href attributes from anchor tags within the selector
            const urls = await page.$$eval(
              `${urlSelector} a[href]`,
              (links, options) => {
                const { includeRelative, includeEmpty, baseUrl } = options;
                const extractedUrls: string[] = [];
                
                links.forEach((link) => {
                  const href = link.getAttribute('href');
                  if (!href) return;
                  
                  // Skip empty hrefs unless specifically included
                  if (!includeEmpty && (href.trim() === '' || href === '#')) return;
                  
                  // Handle relative URLs
                  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
                    if (includeRelative) {
                      if (baseUrl && href.startsWith('/')) {
                        // Convert absolute path to full URL
                        const fullUrl = new URL(href, baseUrl).href;
                        extractedUrls.push(fullUrl);
                      } else if (baseUrl && (href.startsWith('./') || href.startsWith('../'))) {
                        // Convert relative path to full URL
                        try {
                          const fullUrl = new URL(href, baseUrl).href;
                          extractedUrls.push(fullUrl);
                        } catch (e) {
                          // If URL construction fails, include the original href
                          extractedUrls.push(href);
                        }
                      } else {
                        extractedUrls.push(href);
                      }
                    }
                  } else {
                    // Absolute URLs or other protocols
                    extractedUrls.push(href);
                  }
                });
                
                return extractedUrls;
              },
              { includeRelative, includeEmpty, baseUrl }
            );
            
            // Filter duplicates if requested
            const finalUrls = filterDuplicates ? [...new Set(urls)] : urls;
            
            console.log(`📊 Extracted ${urls.length} URLs, final: ${finalUrls.length} (after deduplication)`);
            console.log(`🎯 Sample URLs:`, finalUrls.slice(0, 3));
            
            return {
              success: true,
              variable: {
                name: extractUrlsConfig?.variableName || 'extractedUrls',
                value: finalUrls,
              },
            };
          } catch (error) {
            return { success: false, error: `URL extraction failed: ${error.message}` };
          }

        case 'start':
          // Start node - just a flow marker, no actual execution needed
          return { success: true };

        case 'loop':
          const loopType = config.loop?.type || 'forEach';
          const loopSelector = this.interpolateVariables(config.loop?.selector || '', variables);
          const loopTimes = config.loop?.times || 1;
          const loopCondition = config.loop?.condition || '';
          const arrayVariable = config.loop?.arrayVariable || '';
          const itemVariable = config.loop?.itemVariable || '';
          const indexVariable = config.loop?.indexVariable || '';
          let loopResult = false;

          if (loopType === 'forEach') {
            // For now, just return success - actual loop implementation would be complex
            loopResult = true;
          } else if (loopType === 'times') {
            loopResult = true;
          } else if (loopType === 'while') {
            loopResult = true;
          } else if (loopType === 'array') {
            // Handle array iteration - this will be processed by special loop execution logic
            const arrayData = variables[arrayVariable];
            if (Array.isArray(arrayData) && arrayData.length > 0) {
              loopResult = true;
              // Store loop metadata for special processing
              return {
                success: true,
                condition: loopResult,
                nextHandle: loopResult ? 'true' : 'false',
                isArrayLoop: true,
                arrayData: arrayData,
                loopConfig: {
                  arrayVariable,
                  itemVariable,
                  indexVariable,
                  type: 'array'
                },
              };
            } else {
              loopResult = false;
            }
          }

          return {
            success: true,
            condition: loopResult,
            nextHandle: loopResult ? 'true' : 'false',
            arrayData: loopType === 'array' ? variables[arrayVariable] : undefined,
            loopConfig: config.loop,
          };

        case 'response':
          const responseConfig = config.response;
          const format = responseConfig?.format || 'json';
          const includeMetadata = responseConfig?.includeMetadata || false;
          const combineArrays = responseConfig?.combineArrays || false;
          const variablesToInclude = responseConfig?.variablesToInclude || [];
          
          let responseData: any = {};
          
          // Include specified variables or all variables if none specified
          if (variablesToInclude.length > 0) {
            variablesToInclude.forEach(varName => {
              if (variables[varName] !== undefined) {
                responseData[varName] = variables[varName];
              }
            });
          } else {
            responseData = { ...variables };
          }
          
          // Combine arrays if requested
          if (combineArrays) {
            const arrays = Object.values(responseData).filter(value => Array.isArray(value));
            if (arrays.length > 0) {
              responseData.combinedArrays = arrays.flat();
            }
          }
          
          // Add metadata if requested
          if (includeMetadata) {
            responseData._metadata = {
              executedAt: new Date().toISOString(),
              format,
              variableCount: Object.keys(responseData).length,
            };
          }
          
          // Format response based on format setting
          let formattedResponse: any;
          switch (format) {
            case 'json':
              formattedResponse = responseData;
              break;
            case 'text':
              formattedResponse = JSON.stringify(responseData, null, 2);
              break;
            case 'html':
              formattedResponse = `<pre>${JSON.stringify(responseData, null, 2)}</pre>`;
              break;
            default:
              formattedResponse = responseData;
          }
          
          return {
            success: true,
            response: formattedResponse,
            isTerminalNode: true, // Indicates this is a final response node
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      // Check if execution was cancelled and this is a browser-related error
      if (execution && !this.runningExecutions.get(execution.id)) {
        const browserErrors = [
          'Target page, context or browser has been closed',
          'Browser has been closed',
          'Page has been closed',
          'Context has been closed',
          'Target closed',
          'Protocol error'
        ];
        
        // If this is a browser error and execution was cancelled, return success to avoid false errors
        if (browserErrors.some(browserError => error.message.includes(browserError))) {
          this.logger.debug(`Ignoring browser error after cancellation: ${error.message}`);
          return { success: true, cancelled: true };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  private async executeFlowNodes(
    nodes: any[], 
    edges: any[], 
    page: any, 
    executionVariables: Record<string, any>, 
    executionLog: any[], 
    execution: FlowExecution
  ) {
    // Find Start node (fundamental node) or nodes with no incoming edges
    let startingNodes = nodes.filter(node => 
      node.id === 'start-node' || node.data.action === 'start'
    );
    
    if (startingNodes.length === 0) {
      // Fallback: find nodes with no incoming edges
      startingNodes = nodes.filter(node => 
        !edges.some(edge => edge.target === node.id)
      );
    }

    if (startingNodes.length === 0) {
      throw new Error('No starting node found in flow');
    }

    // Execute from the Start node (or first starting node)
    await this.executeNodeRecursive(
      startingNodes[0], 
      nodes, 
      edges, 
      page, 
      executionVariables, 
      executionLog, 
      execution
    );

    // Check if flow ended at a Response node and capture the final response
    const responseNode = nodes.find(n => n.id === 'response-node' || n.data.action === 'response');
    if (responseNode && executionVariables['_finalResponse']) {
      execution.results = {
        ...execution.results,
        finalResponse: executionVariables['_finalResponse']
      };
    }
  }

  private async executeNodeRecursive(
    currentNode: any,
    nodes: any[],
    edges: any[],
    page: any,
    executionVariables: Record<string, any>,
    executionLog: any[],
    execution: FlowExecution
  ) {
    // Check if execution was stopped
    if (!this.runningExecutions.get(execution.id)) {
      this.logger.log(`Execution ${execution.id} was stopped, skipping node ${currentNode.id}`);
      return;
    }

    execution.currentNode = currentNode.id;
    await this.executionRepository.save(execution);

    // Emit node execution started
    this.webSocketGateway.emitNodeExecution(execution.id, execution.flow.id, {
      nodeId: currentNode.id,
      nodeName: currentNode.data.label,
      action: currentNode.data.action,
      status: 'executing',
      config: currentNode.data.config,
    });

    const result = await this.executeNode(page, currentNode, executionVariables, execution);
    
    executionLog.push({
      nodeId: currentNode.id,
      nodeName: currentNode.data.label,
      action: currentNode.data.action,
      result,
      timestamp: new Date(),
    });

    if (result.error) {
      // Emit node error
      this.webSocketGateway.emitNodeError(execution.id, execution.flow.id, {
        nodeId: currentNode.id,
        nodeName: currentNode.data.label,
        action: currentNode.data.action,
        status: 'error',
        config: currentNode.data.config,
      }, result.error);
      
      throw new Error(`Node ${currentNode.id} failed: ${result.error}`);
    }

    // Update variables if node sets any
    if (result.variable) {
      executionVariables[result.variable.name] = result.variable.value;
    }

    // Pass data to connected nodes
    if (result.variable && result.variable.value !== undefined) {
      this.passDataToConnectedNodes(currentNode, result.variable.value, nodes, edges, executionVariables);
    }

    // Emit node completion
    this.webSocketGateway.emitNodeCompletion(execution.id, execution.flow.id, {
      nodeId: currentNode.id,
      nodeName: currentNode.data.label,
      action: currentNode.data.action,
      status: 'completed',
      result: result,
      config: currentNode.data.config,
    });

    // Emit variable updates
    this.webSocketGateway.emitVariableUpdate(execution.id, execution.flow.id, executionVariables);

    // Emit log message
    this.webSocketGateway.emitLogMessage(execution.id, execution.flow.id, {
      nodeId: currentNode.id,
      nodeName: currentNode.data.label,
      action: currentNode.data.action,
      result: result,
      timestamp: new Date(),
    });

    // Handle response nodes (terminal nodes)
    if (result.isTerminalNode) {
      // Response node - store the final response
      executionVariables['_finalResponse'] = result.response;
      return; // No further execution needed
    }

    // Handle array loops - special processing for iterating through arrays
    if (result.isArrayLoop && result.arrayData && result.loopConfig) {
      await this.executeArrayLoop(
        currentNode,
        result.arrayData,
        result.loopConfig,
        nodes,
        edges,
        page,
        executionVariables,
        executionLog,
        execution
      );
      return;
    }

    // Find next nodes based on the result
    let nextNodes: any[] = [];

    if (result.nextHandle) {
      // Conditional node - find edges with specific sourceHandle
      this.logger.debug(`Looking for edges from node ${currentNode.id} with sourceHandle: ${result.nextHandle}`);
      nextNodes = edges
        .filter(edge => edge.source === currentNode.id && edge.sourceHandle === result.nextHandle)
        .map(edge => nodes.find(node => node.id === edge.target))
        .filter(node => node);
      
      // If no edges found with specific sourceHandle, try finding edges without sourceHandle
      // This handles cases where the edge was created without specifying a sourceHandle
      if (nextNodes.length === 0) {
        this.logger.debug(`No edges found with sourceHandle ${result.nextHandle}, trying edges without sourceHandle`);
        const edgesWithoutHandle = edges.filter(edge => edge.source === currentNode.id && !edge.sourceHandle);
        this.logger.debug(`Found ${edgesWithoutHandle.length} edges without sourceHandle:`, edgesWithoutHandle);
        nextNodes = edgesWithoutHandle
          .map(edge => nodes.find(node => node.id === edge.target))
          .filter(node => node);
      }
    } else {
      // Regular node - find all outgoing edges
      nextNodes = edges
        .filter(edge => edge.source === currentNode.id)
        .map(edge => nodes.find(node => node.id === edge.target))
        .filter(node => node);
    }

    this.logger.debug(`Found ${nextNodes.length} next nodes to execute:`, nextNodes.map(n => n?.id));

    // Execute next nodes
    for (const nextNode of nextNodes) {
      await this.executeNodeRecursive(
        nextNode,
        nodes,
        edges,
        page,
        executionVariables,
        executionLog,
        execution
      );
    }
  }

  private async executeArrayLoop(
    loopNode: any,
    arrayData: any[],
    loopConfig: any,
    nodes: any[],
    edges: any[],
    page: any,
    executionVariables: Record<string, any>,
    executionLog: any[],
    execution: any
  ) {
    const { itemVariable, indexVariable } = loopConfig;
    
    // Find next nodes connected to the loop, separated by handle type
    const loopNodes = edges
      .filter(edge => edge.source === loopNode.id && edge.sourceHandle === 'loop')
      .map(edge => nodes.find(node => node.id === edge.target))
      .filter(node => node);
    
    const afterNodes = edges
      .filter(edge => edge.source === loopNode.id && edge.sourceHandle === 'after')
      .map(edge => nodes.find(node => node.id === edge.target))
      .filter(node => node);
    
    // For backward compatibility, if no sourceHandle is specified, treat as loop nodes
    const legacyNodes = edges
      .filter(edge => edge.source === loopNode.id && !edge.sourceHandle)
      .map(edge => nodes.find(node => node.id === edge.target))
      .filter(node => node);
    
    const nextNodes = [...loopNodes, ...legacyNodes];

    if (nextNodes.length === 0) {
      return; // No nodes to execute
    }

    // Store original variables to restore after loop
    const originalItemValue = executionVariables[itemVariable];
    const originalIndexValue = executionVariables[indexVariable];

    // Execute the loop body for each array item
    for (let i = 0; i < arrayData.length; i++) {
      const currentItem = arrayData[i];
      
      // Set loop variables
      if (itemVariable) {
        executionVariables[itemVariable] = currentItem;
      }
      if (indexVariable) {
        executionVariables[indexVariable] = i;
      }

      // Log the loop iteration
      executionLog.push({
        nodeId: loopNode.id,
        nodeName: `${loopNode.data.label} (iteration ${i + 1})`,
        action: 'loop_iteration',
        result: {
          success: true,
          currentItem,
          index: i,
          totalItems: arrayData.length
        },
        timestamp: new Date(),
      });

      // Execute each connected node for this iteration
      for (const nextNode of nextNodes) {
        await this.executeNodeRecursive(
          nextNode,
          nodes,
          edges,
          page,
          executionVariables,
          executionLog,
          execution
        );
      }
    }

    // Restore original variables if they existed
    if (originalItemValue !== undefined) {
      executionVariables[itemVariable] = originalItemValue;
    } else {
      delete executionVariables[itemVariable];
    }

    if (originalIndexValue !== undefined) {
      executionVariables[indexVariable] = originalIndexValue;
    } else {
      delete executionVariables[indexVariable];
    }

    // After loop completes, execute nodes connected to the "after" handle
    if (afterNodes.length > 0) {
      console.log(`🔄 Loop completed. Executing ${afterNodes.length} after-loop nodes...`);
      
      for (const afterNode of afterNodes) {
        await this.executeNodeRecursive(
          afterNode,
          nodes,
          edges,
          page,
          executionVariables,
          executionLog,
          execution
        );
      }
    }
  }

  private interpolateVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (variables[varName] !== undefined) {
        const value = variables[varName];
        // If it's an array being interpolated, it's probably a mistake - log it
        if (Array.isArray(value)) {
          console.warn(`⚠️  Interpolating array variable "${varName}" with ${value.length} items as string. This might be unintended.`);
          console.warn(`📋 Array content:`, value.slice(0, 3));
        }
        return String(value);
      }
      return match;
    });
  }

  private getVariableValue(config: any, directKey: string, variableKey: string, variables: Record<string, any>, defaultValue: any = ''): any {
    if (config[variableKey] && variables[config[variableKey]] !== undefined) {
      return variables[config[variableKey]];
    }
    if (config[directKey] !== undefined) {
      return typeof config[directKey] === 'string' ? this.interpolateVariables(config[directKey], variables) : config[directKey];
    }
    return defaultValue;
  }

  private passDataToConnectedNodes(currentNode: any, outputData: any, nodes: any[], edges: any[], executionVariables: Record<string, any>) {
    // Find nodes connected to this node
    const connectedEdges = edges.filter(edge => edge.source === currentNode.id);
    
    connectedEdges.forEach(edge => {
      const targetNode = nodes.find(node => node.id === edge.target);
      if (targetNode) {
        // Pass output data as input to connected nodes
        const inputVariableName = `${currentNode.id}_output`;
        executionVariables[inputVariableName] = outputData;
        
        // Also set a generic currentInput variable for easy access
        executionVariables['currentInput'] = outputData;
        
        // For specific node types, set contextual variables
        if (currentNode.data.action === 'extractUrls' && targetNode.data.action === 'loop') {
          executionVariables['extractedUrls'] = outputData;
        }
        if (currentNode.data.action === 'extractText' && targetNode.data.action === 'navigate') {
          executionVariables['extractedText'] = outputData;
        }
      }
    });
  }

  private topologicalSort(nodes: any[], edges: any[]): any[] {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // Initialize
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
    });

    // Build graph
    edges.forEach(edge => {
      adjacencyList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Find nodes with no incoming edges
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const sorted: any[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeMap.get(nodeId));

      adjacencyList.get(nodeId)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      });
    }

    return sorted;
  }

  async stopExecution(executionId: string): Promise<void> {
    this.logger.log(`Stopping execution: ${executionId}`);
    this.runningExecutions.set(executionId, false);
    
    // Immediately cleanup browser resources
    await this.cleanupExecution(executionId, false);
  }

  private async cleanupExecution(executionId: string, keepOpen: boolean = false): Promise<void> {
    const browserInfo = this.executionBrowsers.get(executionId);
    
    if (browserInfo) {
      try {
        if (!keepOpen) {
          // Close page first
          if (browserInfo.page && !browserInfo.page.isClosed()) {
            await browserInfo.page.close();
          }
          
          // Force close browser instance
          if (browserInfo.browser) {
            await browserInfo.browser.close();
          }
        }
      } catch (error) {
        this.logger.error(`Error cleaning up browser for execution ${executionId}:`, error);
      } finally {
        // Remove from tracking
        this.executionBrowsers.delete(executionId);
      }
    }
  }
}