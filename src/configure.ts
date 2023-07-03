export class Configure<WINS extends string, LOSES extends string>
{
  wins: readonly WINS[];
  loses: readonly LOSES[];
  ratio: { [_ in WINS | LOSES]: number; };
  gain: number;

  constructor(wins: readonly WINS[], loses: readonly LOSES[], ratio: { [_ in WINS | LOSES]: number; }, gain: number) {
    if(loses.length == 0){
      throw new Error("specify at least one `loses` element.");
    }
    [...wins, ...loses].forEach((key) => {
      if(ratio[key] < 1){
        throw new Error("the numerical value of each element of `ratio` is 1 or more.");
      }
    });
    this.wins = wins;
    this.loses = loses;
    this.ratio = ratio;
    this.gain = gain;
  }
};
