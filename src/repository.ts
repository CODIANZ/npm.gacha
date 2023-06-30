export interface Repository<WINS extends string, LOSES extends string> {
  // 過去 N 件分のデータを取得する
  getPastResultHistogram(n: number): { [_ in WINS | LOSES]: number };
  // 在庫数を取得する
  getStocks(): { [_ in WINS]: number };
}