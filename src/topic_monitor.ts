
  /**
 * 
 * TODO make a class that moniters topics and adds new topic converters
 * as we encounter new topics that we like.
 */

import {
  ExtensionContext,
  Immutable,
  MessageEvent,
  Topic
} from "@foxglove/extension";

import {
  GridMapMsg
} from "./types"

import {
  convertGridMap
} from "./converter"

import {
  SettingsManager
} from "./manager"



export class TopicMonitor {

  private context : ExtensionContext | undefined;
  private manager : SettingsManager;
  protected topic_set : Set<string>;
  private activations_called : number;

  constructor(manager : SettingsManager){
    this.activations_called = 0;
    this.context = undefined;
    this.topic_set = new Set<string>();
    this.manager = manager;
  }


  setContext( context : ExtensionContext ): void{
    this.context = context;
    this.topic_set.clear();
  }

  
  makeNewTopicConverter(topic: string, type: string): void {
    console.log("called makeNewTopicConverter");
    if( this.context !== undefined ){
      if( this.topic_set.has(topic) == true ){
        return;
      }
      else if( 
        type === "grid_map_msgs/msg/GridMap"
        || type === "grid_map_msgs/GridMap"
      ){
        console.log("Registered message converter for",topic);
        this.context.registerMessageConverter(
          {
            type: "topic",
            inputTopics: [ topic ],
            outputTopic: topic+"/visual",
            outputSchemaName: "foxglove.SceneUpdate",
            create: () => {
              return (msgEvent: Immutable<MessageEvent>) => {
                if(
                  msgEvent.schemaName === "grid_map_msgs/msg/GridMap"
                  || msgEvent.schemaName === "grid_map_msgs/GridMap"
                ){
                  const msg = msgEvent.message as GridMapMsg;
                  this.manager.initalizeEmptyTopic(
                    msgEvent.topic, msg.layers.slice()
                  );
                  const settings = 
                    this.manager.getSettings().get(msgEvent.topic);
                  return convertGridMap(msg, settings?.settings);
                }
                else {
                  return undefined;
                }
              }
            }
          }
        );
        this.topic_set.add(topic);
      }
    }
  }


  scanTopicList( topics: Immutable<Topic[]> ) : void {
    for( const topic of topics ){
      if( 
        topic.schemaName === "grid_map_msgs/msg/GridMap"
        || topic.schemaName === "grid_map_msgs/GridMap"
      ){
        this.makeNewTopicConverter(
          topic.name,
          topic.schemaName
        );
      }
    }
  }


  gatherOldTopicsForRegistry() : string[] {
    this.activations_called += 1;
    console.log("Calls to gatherOldTopics:",this.activations_called);
    const arr : string[] = [];
    for( const topic of this.topic_set ){
      arr.push(topic);
    }
    return arr;
  }


  

}