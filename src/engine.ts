
import { Configure } from './configure';
import { Repository } from './repository';

export class Engine<WINS extends string, LOSES extends string> {
  private readonly m_config: Configure<WINS, LOSES>;
  private readonly m_data_repository: Repository<WINS, LOSES>;
  private readonly m_wins_and_loses: (WINS | LOSES)[];

  private isWins(wins_or_loses: WINS | LOSES): wins_or_loses is WINS {
    return this.m_config.wins.filter(x => x === wins_or_loses).length > 0;
  }

  constructor(
    config: Configure<WINS, LOSES>,
    data_repository: Repository<WINS, LOSES>
  ) {
    this.m_config = config;
    this.m_data_repository = data_repository;
    this.m_wins_and_loses = [...config.wins, ...config.loses];
  }

  private getPercentage(src: { [_ in WINS | LOSES]: number }):  { [_ in WINS | LOSES]: number } {
    const total = this.getTotal(src);
    const result = {...src};
    this.m_wins_and_loses.forEach((key) => {
      result[key] /= total;
    });
    return result;
  };

  private getTotal(src: { [_ in WINS | LOSES]: number }): number {
    return this.m_config.wins.reduce((acc, key) => acc + src[key], 0) +
      this.m_config.loses.reduce((acc, key) => acc + src[key], 0);
  }

  private getPartialPercentage(src: { [_ in WINS | LOSES]?: number }):  { [_ in WINS | LOSES]?: number } {
    const total = this.getPartialTotal(src);
    const result = {...src};
    this.m_wins_and_loses.forEach((key) => {
      const value = src[key];
      if(value){
        result[key] = value / total;
      }
    });
    return result;
  };

  private getPartialTotal(src: { [_ in WINS | LOSES]?: number }): number {
    return this.m_wins_and_loses.reduce((acc, key) => {
      const value = src[key];
      return value !== undefined ? acc + value : acc;
    }, 0)
  }

  execute(): WINS | LOSES {
    const ideal_percentage = this.getPercentage(this.m_config.ratio);
    // console.log("ideal_percentage", ideal_percentage);

    const past_data = this.m_data_repository.getPastResultHistogram(this.getTotal(this.m_config.ratio) * 100);
    // console.log("past_data", past_data);

    const offset_past_data = (() => {
      const data = {...past_data};
      const gain = this.m_config.gain;
      const ratio = this.m_config.ratio;
      this.m_wins_and_loses.forEach((key) => {
        data[key] += ratio[key] * gain;
      });
      return data;
    })();
    // console.log("offset_past_data", offset_past_data);
    
    const past_percentage = this.getPercentage(offset_past_data);
    // console.log("past_percentage", past_percentage);

    const availables = (() => {
      const result: { [_ in WINS | LOSES]?: number } = {};
      const keys: (WINS | LOSES)[] = [];
      const stocks = this.m_data_repository.getStocks();
      this.m_wins_and_loses.forEach((key) => {
        if(past_percentage[key] < ideal_percentage[key]){
          if(this.isWins(key)){
            if(stocks[key] > 0){
              keys.push(key);
            }
          }
          else{
            keys.push(key);
          }
        }
      });

      if(keys.length === 0){
        this.m_wins_and_loses.forEach((key) => {
          result[key] = this.m_config.ratio[key];
        });
      }
      else{
        keys.forEach((key) => {
          result[key] = this.m_config.ratio[key];
        });
      }
      return result;
    })();
    // console.log("availables", availables);

    const available_percentage = this.getPartialPercentage(availables);
    // console.log("available_percentage", available_percentage);
    
    const gacha_result = ((): WINS | LOSES | undefined => {
      let random = Math.random();
      let result: WINS | LOSES | undefined = undefined;
      this.m_wins_and_loses.forEach((key) => {
        if(result !== undefined) return;
        const value = available_percentage[key];
        if(value !== undefined){
          random -= value;
          if(random <= 0){
            result = key;
          }
        }
      });
      return result;
    })();

    if(gacha_result === undefined){
      throw new Error("logic error");
    }
    else{
      return gacha_result;
    }
  }
}


