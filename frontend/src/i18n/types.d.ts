import 'react-i18next';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: {
        common: {
          cancel: string;
          save: string;
          delete: string;
          edit: string;
          close: string;
          ok: string;
          yes: string;
          no: string;
          loading: string;
          error: string;
          success: string;
          warning: string;
          info: string;
        };
        flow: {
          header: {
            enterFlowName: string;
            addDescription: string;
            addDescriptionOptional: string;
            connected: string;
            disconnected: string;
            new: string;
            browse: string;
            save: string;
            update: string;
            logs: string;
            run: string;
            running: string;
            newFlow: string;
            browseFlows: string;
            updateFlow: string;
            saveFlow: string;
            toggleLogs: string;
            runFlow: string;
            browserSettings: string;
            apiSettings: string;
            exportFlow: string;
            importFlow: string;
            clearFlow: string;
            moreOptions: string;
          };
          actions: {
            title: string;
          };
          nodeTypes: {
            [key: string]: {
              label: string;
              description: string;
            };
          };
          config: {
            [key: string]: string;
            placeholder: {
              [key: string]: string;
            };
          };
        };
        language: {
          selector: {
            title: string;
            english: string;
            portuguese: string;
          };
        };
        dialogs: {
          [key: string]: {
            title: string;
            message: string;
            confirm: string;
            cancel: string;
          };
        };
        toast: {
          [key: string]: string;
        };
      };
    };
  }
}