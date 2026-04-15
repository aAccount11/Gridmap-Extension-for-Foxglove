import { 
  Immutable, 
  PanelExtensionContext,
} from "@foxglove/extension";
import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useState
} from "react";

import {
  createRoot
} from "react-dom/client";

import {
  SettingsMap
} from "./types"

import { 
  updateSettings,
  actionHandler
} from "./settings";

import {
  SettingsManager
} from "./manager"

import { 
  AdaptiveTopicMonitor 
} from "./adaptive_topic_monitor";


function SettingsPanel(
  { context, settingsManager, topicMonitor }: { 
    context: PanelExtensionContext;
    settingsManager: SettingsManager;
    topicMonitor: AdaptiveTopicMonitor
   }
): ReactElement
{
  const [renderDone, setRenderDone] =
    useState<(() => void) | undefined>();

  useLayoutEffect(
    () => {
      context.onRender = (renderState, done) => {
        topicMonitor.scanTopicList(renderState.topics ?? []);
        settingsManager.removeUnusedTopics(renderState.topics ?? []);
        setRenderDone(() => done);
      }
      context.watch("topics");
    },
    [context]
  );

  useEffect(
    () => {
      const callback = (settings: Immutable<SettingsMap> ) => {
        context.updatePanelSettingsEditor(
          {
            nodes: updateSettings(
              settings,
              topicMonitor.getOptions(),
              topicMonitor.getActualChoices(),
              topicMonitor.getChoice()
            ),
            actionHandler: actionHandler(
              settingsManager,
              topicMonitor
            )
          }
        );
      };
      settingsManager.addCallback(callback);
      settingsManager.runFirstTime();
      return () => {
        settingsManager.removeCallback(callback);
      }
    },
    [context]
  )

  useEffect(
    () => {
      renderDone?.();
    },
    [renderDone]
  );

  return (
    <div>
      <div>Instructions:</div>
      <div>1. Click on Gridmap Foxglove panel</div>
      <div>2. Go to panel settings </div>
      <div>3. Under 'Refresh Toggle' run scan topics </div>
      <div>4. Save topics using corresponding Yes button </div>
      <div>5. Reload using Ctrl+r </div>
      <div>6. Mess with panel settings for desired results </div>
    </div>
  );
}


export function initSettingsPanel(
  context: PanelExtensionContext,
  manager: SettingsManager,
  monitor: AdaptiveTopicMonitor
): () => void
{
  const root = createRoot(context.panelElement);
  root.render(
    <SettingsPanel 
      context={context} 
      settingsManager={manager}
      topicMonitor={monitor}
    />
  );
  return () => {
    root.unmount();
  }
}