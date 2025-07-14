export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    action: NodeAction;
    config: any;
    onEdit?: () => void;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type NodeAction = 
  | 'start'
  | 'navigate'
  | 'click'
  | 'type'
  | 'waitFor'
  | 'scroll'
  | 'extractText'
  | 'extractHtml'
  | 'extractAttribute'
  | 'screenshot'
  | 'waitTime'
  | 'condition'
  | 'loop'
  | 'setVariable'
  | 'api'
  | 'isVisible'
  | 'hover'
  | 'selectOption'
  | 'checkBox'
  | 'keyPress'
  | 'iframe'
  | 'download'
  | 'uploadFile'
  | 'clearCookies'
  | 'setCookie'
  | 'alert'
  | 'regex'
  | 'extractUrls'
  | 'response';

export interface NodeConfig {
  navigate?: {
    url?: string;
  };
  click?: {
    selector?: string;
    waitBefore?: number;
  };
  type?: {
    selector?: string;
    text?: string;
    delay?: number;
    clear?: boolean;
  };
  waitFor?: {
    selector?: string;
    timeout?: number;
    state?: 'visible' | 'attached' | 'detached' | 'hidden';
  };
  scroll?: {
    selector?: string;
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
  };
  extractText?: {
    selector?: string;
    multiple?: boolean;
    variableName?: string;
  };
  extractHtml?: {
    selector?: string;
    variableName?: string;
  };
  extractAttribute?: {
    selector?: string;
    attribute?: string;
    variableName?: string;
  };
  screenshot?: {
    selector?: string;
    fullPage?: boolean;
    variableName?: string;
  };
  waitTime?: {
    duration?: number;
  };
  condition?: {
    type?: 'exists' | 'contains' | 'equals' | 'regex';
    selector?: string;
    value?: string;
    variable?: string;
  };
  loop?: {
    type?: 'forEach' | 'while' | 'times' | 'array';
    selector?: string;
    times?: number;
    condition?: string;
    arrayVariable?: string;
    itemVariable?: string;
    indexVariable?: string;
  };
  setVariable?: {
    name?: string;
    value?: string;
  };
  api?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    variableName?: string;
  };
  isVisible?: {
    selector?: string;
    timeout?: number;
  };
  hover?: {
    selector?: string;
    duration?: number;
  };
  selectOption?: {
    selector?: string;
    value?: string;
    text?: string;
  };
  checkBox?: {
    selector?: string;
    action?: 'check' | 'uncheck' | 'toggle';
  };
  keyPress?: {
    keys?: string;
    modifiers?: string[];
  };
  iframe?: {
    selector?: string;
    action?: 'enter' | 'exit';
  };
  download?: {
    selector?: string;
    filename?: string;
    variableName?: string;
  };
  uploadFile?: {
    selector?: string;
    filePath?: string;
  };
  clearCookies?: {
    domain?: string;
  };
  setCookie?: {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    expires?: string;
  };
  alert?: {
    action?: 'accept' | 'dismiss' | 'getText';
    text?: string;
    variableName?: string;
  };
  regex?: {
    source?: 'variable' | 'element' | 'text';
    variableName?: string;
    selector?: string;
    text?: string;
    pattern?: string;
    flags?: string;
    operation?: 'match' | 'replace' | 'extract' | 'test';
    replacement?: string;
    outputVariable?: string;
    matchAll?: boolean;
  };
  extractUrls?: {
    selector?: string;
    variableName?: string;
    includeRelative?: boolean;
    baseUrl?: string;
    filterDuplicates?: boolean;
    includeEmpty?: boolean;
  };
  start?: {
    description?: string;
  };
  response?: {
    format?: 'json' | 'text' | 'html';
    includeMetadata?: boolean;
    combineArrays?: boolean;
    variablesToInclude?: string[];
  };
}

export interface BrowserSettings {
  keepOpen?: boolean;
  stealth?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  headless?: boolean;
}

export interface ApiConfig {
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  parameters?: Array<{
    name: string;
    type: 'query' | 'body' | 'param';
    required: boolean;
    description?: string;
    defaultValue?: any;
  }>;
  response?: {
    type: 'json' | 'text' | 'html' | 'binary';
    schema?: any;
  };
}

export interface FlowData {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  variables: Record<string, any>;
  browserSettings?: BrowserSettings;
  apiConfig?: ApiConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowExecution {
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNode?: string;
  results: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}