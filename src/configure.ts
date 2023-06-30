
export class Configure<WINS extends string, LOSES extends string>
{
  wins: readonly WINS[];
  loses: readonly LOSES[];
  ratio: { [_ in WINS | LOSES]: number };
  gain: number;

  constructor(wins: readonly WINS[], loses: readonly LOSES[], ratio: { [_ in WINS | LOSES]: number }, gain: number) {
    this.wins = wins;
    this.loses = loses;
    this.ratio = ratio;
    this.gain = gain;
  }
};
