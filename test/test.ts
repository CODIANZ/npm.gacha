import * as gacha from "../src";

const wins = ["gold", "silver", "bronze"] as const;
const loses = ["none1", "none2"] as const;

type wins_t =  typeof wins[number];
type loses_t =  typeof loses[number];


function isWins(wins_or_loses: wins_t | loses_t): wins_or_loses is wins_t {
  return wins.filter(x => x === wins_or_loses).length > 0;
}

function test_normal(count_per_set: number, set_count: number) {
  class RepoSample implements gacha.Repository<wins_t, loses_t> {
    private m_data: Array<wins_t | loses_t> = [];
    private m_stocks?: { [_ in wins_t]: number; };
  
    constructor(stocks?: { [_ in wins_t]: number; }) {
      this.m_stocks = stocks;
    }
  
    getPastResultHistogram(n: number): Promise<{ [_ in wins_t | loses_t]: number; }> {
      const data = this.m_data.slice(-n);
      return Promise.resolve({
          gold: data.filter((v) => v === "gold").length,
          silver: data.filter((v) => v === "silver").length,
          bronze: data.filter((v) => v === "bronze").length,
          none1: data.filter((v) => v === "none1").length,
          none2: data.filter((v) => v === "none2").length,
      });
    }
  
    getStocks(): Promise<{ [_ in wins_t]: number; }> {
      const stocks = this.m_stocks;
      return Promise.resolve(stocks ? { ...stocks } : {
        gold: 1,
        silver: 1,
        bronze: 1,
      });
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
  
    public dump(num: number) {
      return this.getPastResultHistogram(this.m_data.length).then((hist) => {
        console.log(`count#${num}`, hist);
        [...wins, ...loses].forEach((k) => {
          hist[k] = hist[k] / this.m_data.length;
        });
        console.log(`ratio#${num}`, hist);
      });
    }
  };
  
  function execute_multiple(num: number, config: gacha.Configure<wins_t, loses_t>, repo_ctor: () => RepoSample, count: number){
    let promiseChain = Promise.resolve();
    const repo = repo_ctor();
    const engine = new gacha.Engine(config, repo);
    for(let i = 0; i < count; i++){
      promiseChain = promiseChain.then(() => {
        return engine.execute().then((result) => {
          repo.addData(result);
        });
      });
    }
    return promiseChain
    .then(() => {
      return repo.dump(num);
    });
  }
  
  function execute_multiple_set(config: gacha.Configure<wins_t, loses_t>, repo_ctor: () => RepoSample, count: number, inner_count: number){
    const wins_and_loses = [...wins, ...loses];
    const total = wins_and_loses.reduce((acc, key) => acc + config.ratio[key], 0);
    const ratio: { [_ in wins_t | loses_t]?: number; } = {};
    wins_and_loses.forEach((key) => {
      ratio[key] = config.ratio[key] / total;
    });
    console.log("ideal", ratio);
  
    let promiseChain = Promise.resolve();
    for(let i = 0; i < count; i++){
      promiseChain = promiseChain.then(() => {
        return execute_multiple(i + 1, config, repo_ctor, inner_count);
      });
    }
    return promiseChain;
  }

  /** begin main process */
  return Promise.resolve()
  .then(() => {
    console.log("stock unmanaged");
  })
  .then(() => {
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
      100
    );
    const repo_ctor = () => new RepoSample();
    return execute_multiple_set(config, repo_ctor, set_count, count_per_set);
  })
  
  .then(() => {
    console.log("stock managed");
  })
  .then(() => {
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
      100
    );
    const repo_ctor = () => new RepoSample({
      gold: 1,
      silver: 20,
      bronze: 30,
    });
    return execute_multiple_set(config, repo_ctor, set_count, count_per_set);
  });
}

function test_errors() {
  type error_on_t = "getPastResultHistogram" | "getStocks";
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
    100
  );
  class RepoError implements gacha.Repository<wins_t, loses_t> {
    private readonly m_error_on: error_on_t;
    constructor(error_on: error_on_t) {
      this.m_error_on = error_on;
    }
    getPastResultHistogram(n: number): Promise<{ [_ in wins_t | loses_t]: number; }> {
      if(this.m_error_on == "getPastResultHistogram"){
        return Promise.reject(new Error("getPastResultHistogram() error"));
      }
      else{
        return Promise.resolve({
          gold: 1,
          silver: 20,
          bronze: 30,
          none1: 20,
          none2: 50
        });
      }
    }
  
    getStocks(): Promise<{ [_ in wins_t]: number; }> {
      if(this.m_error_on == "getStocks"){
        return Promise.reject(new Error("getStocks() error"));
      }
      else{
        return Promise.resolve({
          gold: 1,
          silver: 20,
          bronze: 30,
        });
      }
    }
  };
  return (new gacha.Engine(config, new RepoError("getPastResultHistogram"))).execute()
  .catch((e) => {
    console.log("[expected error]", e);
    return (new gacha.Engine(config, new RepoError("getStocks"))).execute();
  })
  .catch((e) => {
    console.log("[expected error]", e);
  });
}

function test_configure(){
  try{
    const config = new gacha.Configure(
      wins,
      loses,
      {
        gold: 1,
        silver: 20,
        bronze: 0,
        none1: 20,
        none2: 50
      },
      100
    );
  }
  catch(e){
    console.log("[expected error]", e);
  }

  try{
    const config = new gacha.Configure(
      wins,
      [],
      {
        gold: 1,
        silver: 20,
        bronze: 0
      },
      100
    );
  }
  catch(e){
    console.log("[expected error]", e);
  }

  return Promise.resolve();
}

// test_normal(1000000, 10)
test_normal(100, 10)
.then(() => {
  return test_errors()
})
.then(() => {
  return test_configure()
});