export interface Repository<WINS extends string, LOSES extends string> {
  getPastResultHistogram(n: number): Promise<{ [_ in WINS | LOSES]: number; }>;
  getStocks(): Promise<{ [_ in WINS]: number; }>;
}