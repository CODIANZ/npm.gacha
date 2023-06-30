import * as gacha from "../src";

const wins = ["gold", "silver", "bronze"] as const;
const loses = ["none1", "none2"] as const;

type wins_t =  typeof wins[number];
type loses_t =  typeof loses[number];


function isWins(wins_or_loses: wins_t | loses_t): wins_or_loses is wins_t {
  return wins.filter(x => x === wins_or_loses).length > 0;
}

const config = new gacha.Configure(
  wins,
  loses,
  {
    gold: 1,
    silver: 20,
    bronze: 30,
    none1: 20,
    none2: 50
  },
  10000
);

{
  const wins_and_loses = [...wins, ...loses];
  const total = wins_and_loses.reduce((acc, key) => acc + config.ratio[key], 0);
  const ratio: { [_ in wins_t | loses_t]?: number } = {};
  wins_and_loses.forEach((key) => {
    ratio[key] = config.ratio[key] / total;
  });
  console.log("ideal", ratio);
}


class RepoSample implements gacha.Repository<wins_t, loses_t> {
  private m_data: Array<wins_t | loses_t> = [];
  private m_stocks?: { [_ in wins_t]: number };

  constructor(stocks?: { [_ in wins_t]: number }) {
    this.m_stocks = stocks;
  }

  getPastResultHistogram(n: number): { [_ in wins_t | loses_t]: number } {
    const data = this.m_data.slice(-n);
    return {
      gold: data.filter((v) => v === "gold").length,
      silver: data.filter((v) => v === "silver").length,
      bronze: data.filter((v) => v === "bronze").length,
      none1: data.filter((v) => v === "none1").length,
      none2: data.filter((v) => v === "none2").length,
    };
  }

  getStocks(): { [_ in wins_t]: number } {
    const stocks = this.m_stocks;
    if(stocks){
      return { ...stocks };
    }
    else{
      return {
        gold: 1,
        silver: 1,
        bronze: 1,
      };
    }
  }

  public addData(data: wins_t | loses_t): boolean {
    if(isWins(data)){
      const stocks = this.m_stocks;
      if(stocks === undefined){
        this.m_data.push(data);
      }
      else if(stocks[data] <= 0){
        return false;
      }
      else {
        stocks[data] -= 1;
        this.m_data.push(data);
      }
    }
    else{
      this.m_data.push(data);
    }
    return true;
  }

  public dump() {
    const hist = this.getPastResultHistogram(this.m_data.length);
    console.log("count", hist);
    [...wins, ...loses].forEach((k) => {
      hist[k] = hist[k] / this.m_data.length;
    });
    console.log("ratio", hist);
  }
};

console.log("stock unmanaged");
for(let k = 0; k < 10; ++k){
  const repo = new RepoSample()
  const engine = new gacha.Engine(config, repo);
  for(let i = 0; i < 10000; ++i){
    const result = engine.execute();
    repo.addData(result);
  }
  repo.dump();
}

console.log("stock managed");
for(let k = 0; k < 10; ++k){
  const repo = new RepoSample({
    gold: 1,
    silver: 20,
    bronze: 30,
  });
  const engine = new gacha.Engine(config, repo);
  for(let i = 0; i < 10000; ++i){
    const result = engine.execute();
    repo.addData(result);
  }
  repo.dump();
}
