import {
  ExtensionContext
} from "@foxglove/extension";


import {
  initSettingsPanel
} from "./Settings"

import {
  SettingsManager
} from "./manager"


import { 
  AdaptiveTopicMonitor
} from "./adaptive_topic_monitor";


const trackedTopics = new SettingsManager();
const topicConverters = new AdaptiveTopicMonitor(
  trackedTopics
);


export function activate(extensionContext: ExtensionContext): void {
  console.log("Called activate");
  trackedTopics.resetObject();
  topicConverters.setContext(extensionContext);
  extensionContext.registerPanel(
    {
      name: "Gridmap Foxglove", 
      initPanel:(context) => {
        return initSettingsPanel(
          context, 
          trackedTopics,
          topicConverters
        );
      }
    }
  );
}
