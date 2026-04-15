import { 
  SettingsTreeNodes, 
  SettingsTreeAction,
  Immutable,
  SettingsTreeNode
} from "@foxglove/extension";

import {
  SettingsManager
} from "./manager"

import {
  AdaptiveTopicMonitor
} from "./adaptive_topic_monitor"

import {
  SettingsMap,
  ColorTransform
} from "./types"


export function actionHandler(
  manager: SettingsManager,
  monitor: AdaptiveTopicMonitor
){
  return (action: SettingsTreeAction) => {
    if(action.action === "update"){
      const { path, value } = action.payload;
      if(path.length === 2){
        switch( path[1] ){
          case "height_layer":
            manager.setHeightLayer(
              path[0] as string,
              value as string
            );
            break;
          case "color_layer":
            manager.setColorLayer(
              path[0] as string,
              value as string
            );
            break;
          case "color_transform":
            manager.setColorTransform(
              path[0] as string,
              value as ColorTransform
            );
            break;
          case "auto_compute_bounds":
            manager.setAutoComputeBounds(
              path[0] as string,
              value as boolean
            );
            break;
          case "bounds_min":
            manager.setBoundMin(
              path[0] as string,
              value as number
            );
            break;
          case "bounds_max":
            manager.setBoundMax(
              path[0] as string,
              value as number
            );
            break;
          case "choice":
            if(path[0] as string === "select_topic"){
              monitor.setOption(value as string);
              manager.runFirstTime();
            }
            break;
          case "scan_topics":
            if(path[0] as string === "refresh"){
              manager.runFirstTime();
            }
            break;
          case "save_topics":
            if(path[0] as string === "refresh"){
              monitor.saveTopics();
              manager.runFirstTime();
            }
            break;
          case "clear_topics":
            if(path[0] as string === "refresh"){
              monitor.clearSave();
            }
            break;
          default:break;
        }
      }
    }
  };
}


export function updateSettings(
  settings: Immutable<SettingsMap>,
  topic_list: Immutable<string[]>,
  known_topics: Immutable<string[]>,
  topic_choice: string
): SettingsTreeNodes
{

  let index : number = 0;
  const obj : SettingsTreeNodes = {};
  const refresh_node : SettingsTreeNode = {
    label: "Refresh Toggle",
    fields: {
      scan_topics: {
        label: "Choose Yes to scan topics",
        input: "toggle",
        value: "No",
        options: ["Yes","No"]
      },
      save_choices: {
        label: "List of relevent Topics",
        input: "multiline-string",
        readonly: true,
        value: topic_list.join('\n')
      },
      save_topics: {
        label: "Choose Yes to save these topics",
        input: "toggle",
        value: "No",
        options: ["Yes","No"]
      },
      clear_topics: {
        label: "Choose Yes to reset the save",
        input: "toggle",
        value: "No",
        options: ["Yes","No"]
      }
    },
    order: index++
  }
  const choice_node : SettingsTreeNode = {
    label: "Displayed Topic",
    fields: {
      choice: {
        label: "Topic",
        input: "select",
        value: topic_choice,
        options: known_topics.map(
          (s: string) => ({label:s, value:s})
        )
      }
    },
    order: index++
  };
  obj["refresh"] = refresh_node;
  obj["select_topic"] = choice_node;
  obj["divider1"] = {
    actions:[{type:"divider"}],
    order: index++,
    label: "List of Topics:"
  };
  for(const [topic,item] of settings ){
    obj[topic] = {
      label: topic,
      fields: {
        height_layer: {
          label: "Height Layer",
          input: "select",
          value: item.settings.height_layer,
          options: item.layers.map(
            (s: string) => ({label:s, value:s})
          )
        },
        color_layer: {
          label: "Color Layer",
          input: "select",
          value: item.settings.color_layer,
          options: item.layers.map(
            (s: string) => ({label:s, value:s})
          )
        },
        color_transform: {
          label: "Color Transform",
          input: "select",
          value: item.settings.color_transform,
          options: [
            {
              label: "INTENSITY",
              value: ColorTransform.INTENSITY
            },
            {
              label: "RGBA",
              value: ColorTransform.RGBA,
            }
          ]
        },
        auto_compute_bounds: 
          item.settings.color_transform === ColorTransform.INTENSITY ?
            (
              {
                label: "Auto Bounds",
                input: "boolean",
                value: item.settings.auto_compute_bounds
              }
            )
          :
            undefined,
        bounds_min:
          item.settings.color_transform === ColorTransform.INTENSITY
          && item.settings.auto_compute_bounds === false ? 
            (
              {
                label: "Min",
                input: "number",
                value: item.settings.bound_min
              }
            )
          :
            undefined,
        bounds_max:
          item.settings.color_transform === ColorTransform.INTENSITY
          && item.settings.auto_compute_bounds === false ?
            (
              {
                label: "Max",
                input: "number",
                value: item.settings.bound_max
              }
            )
          :
            undefined
      },
      order: index++
    };
  }
  return obj;
}