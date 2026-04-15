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



export class AdaptiveTopicMonitor {

  private list_of_topics : string[];
  private saved_topics : string[];
  private context : ExtensionContext | undefined;
  private manager : SettingsManager;
  private topic_set : Set<string>;


  constructor(manager : SettingsManager){
    this.manager = manager;
    this.context = undefined;
    this.list_of_topics = ["null"];
    this.saved_topics = this._getSave();
    this.topic_set = new Set<string>();
  }

  private _getSave() : string[] {
    const res = localStorage.getItem("saved_topics");
    if( res !== null ){
      const saved_topics = JSON.parse(res);
      if( Array.isArray(saved_topics) === true ){
        if( 
          saved_topics.every(
            (value) => {
              return typeof value === "string"
            }
          )
        ){
          return saved_topics
        }
      }
    }
    return ["null"];
  }

  getSavedTopics(){
    return this.saved_topics;
  }

  getActualChoices() : string[] {
    const temp = new Set<string>(this.saved_topics);
    const arr : string[]= [];
    for( const str of this.topic_set ){
      if( temp.delete(str) === true ){
        arr.push(str);
      }
    }
    return arr;
  }

  saveTopics(){
    localStorage.setItem(
      "saved_topics",
      JSON.stringify(
        this.getOptions()
      )
    );
  }

  clearSave(){
    localStorage.setItem(
      "saved_topics",
      "[\"null\"]"
    );
  }

  setContext( context : ExtensionContext ): void {
    if( context !== this.context ){
      this.context = context;
      // why did I do this...?
      this.list_of_topics.splice(
        0, this.list_of_topics.length
      );
      this.list_of_topics.push(
        this.saved_topics[0] ?? "null"
      );
      this.context.registerMessageConverter(
        {
          type: "topic",
          inputTopics: this.saved_topics,
          outputTopic: "grid_map_floxglove",
          outputSchemaName: "foxglove.SceneUpdate",
          create: () => {
            return (msgEvent: Immutable<MessageEvent>) => {
              if(this.topic_set.size === 0){
                return undefined;
              }
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
                if(this.list_of_topics[0] === msgEvent.topic){
                  return convertGridMap(msg, settings?.settings);
                }
                return undefined;
              }
              else {
                return undefined;
              }
            };
          }
        }
      );
    }
  }


  scanTopicList( topics: Immutable<Topic[]> ): void {
    for( const topic of topics ){
      if( 
        topic.schemaName === "grid_map_msgs/msg/GridMap"
        || topic.schemaName === "grid_map_msgs/GridMap"
      ){
        this.topic_set.add(topic.name); 
      }
    }
  }


  getOptions(): string[] {
    const arr : string[] = [];
    for( const str of this.topic_set ){
      arr.push(str);
    }
    return arr;
  }


  setOption(str: string): void {
    if(this.topic_set.has(str) === true){
      this.list_of_topics[0] = str;
    }
  }


  getChoice(): string {
    return this.list_of_topics[0] ?? "null";
  }
}