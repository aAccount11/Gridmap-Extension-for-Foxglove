import { 
  Immutable,
  Topic
} from "@foxglove/extension";
import { 
  SettingsMap,
  SettingsMapItem,
  ColorTransform
} from "./types"

type callback_fn = ( arg: Immutable<SettingsMap> ) => void;

export class SettingsManager {  

  private settings : SettingsMap;
  private callback_fns: Set<callback_fn>;
  private should_update: boolean;

  constructor(){
    this.settings = new Map<string, SettingsMapItem>();
    this.callback_fns = new Set<callback_fn>();
    this.should_update = false;
  }

  
  resetObject(){
    this.settings.clear();
    this.callback_fns.clear();
    this.should_update = false;
  }


  addCallback(
    callback: ( arg: Immutable<SettingsMap> ) => void
  ): void
  {
    this.callback_fns.add( callback );
  }


  removeCallback(
    callback: ( arg: Immutable<SettingsMap> ) => void
  ): void
  {
    this.callback_fns.delete( callback );
  }


  initalizeEmptyTopic(
    name: string,
    layers?: string[]
  ): void
  {
    if(this.settings.has(name) === false ){
      this.settings.set(
        name,
        {
          layers: layers ?? [],
          settings: {
            height_layer: undefined,
            color_layer: undefined,
            color_transform: ColorTransform.INTENSITY,
            auto_compute_bounds: true,
            bound_min:0,
            bound_max:10
          }
        }
      );
      this.update();
    }
  }


  removeUnusedTopics(
    topics: Immutable<Topic[]>
  ){
    const set_of_topics = new Set<string>();
    const keys = [...this.settings.keys()];
    let updated = false;
    for(const topic of topics){
      set_of_topics.add(topic.name);
    }
    for(const key of keys){
      if(set_of_topics.has(key) === false){
        this.settings.delete(key);
        updated = true;
      }
    }
    if(updated === true ){
      this.update();
    }
  }


  getSettings() : Immutable<SettingsMap> {
    return this.settings;
  }


  setLayers(
    topic: string,
    layers: string[]
  ): void
  {
    const my_item = this.settings.get(topic);
    if( my_item !== undefined ){
      my_item.layers = layers;
      this.update();
    }
  }


  setHeightLayer(
    topic: string,
    layer: string
  ): void
  {
    const my_item = this.settings.get(topic);
    if( my_item !== undefined && my_item.layers.includes(layer) ){
      my_item.settings.height_layer = layer;
      this.update();
    }
  }


  setColorLayer(
    topic: string,
    layer: string
  ): void
  {
    const my_item = this.settings.get(topic);
    if( my_item !== undefined && my_item.layers.includes(layer) ){
      my_item.settings.color_layer = layer;
      this.update();
    }
  }


  setColorTransform(
    topic: string,
    transform: ColorTransform
  ): void
  {
    const my_item = this.settings.get(topic);
    if( my_item !== undefined ){
      my_item.settings.color_transform = transform;
      this.update();
    }
  }


  setAutoComputeBounds(
    topic: string,
    toggle: boolean
  ): void
  {
    const my_item = this.settings.get(topic);
    if( my_item !== undefined ){
      my_item.settings.auto_compute_bounds = toggle;
      this.update();
    }
  }


  setBoundMin(
    topic: string,
    value: number
  ): void
  {
    const my_item = this.settings.get(topic);
    if(
      my_item !== undefined 
      && value < (my_item.settings.bound_max ?? Infinity)
    ){
      my_item.settings.bound_min = value;
      this.update();
    }
  }


  setBoundMax(
    topic: string,
    value: number
  ): void
  {
    const my_item = this.settings.get(topic);
    if(
      my_item !== undefined 
      && value > (my_item.settings.bound_min ?? -Infinity)
    ){
      my_item.settings.bound_max = value;
      this.update();
    }
  }


  runFirstTime(){
    this.update();
  }


  private update(): void {
    if(this.should_update !== true){
      this.should_update = true;
      setTimeout(
        () => {
          for( const fn of this.callback_fns ){
            fn(this.settings);
          }
          this.should_update = false;
        }
      );
    }
  }

}