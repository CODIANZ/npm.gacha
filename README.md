# 抽選ライブラリ

## 特徴

* 抽選処理はサービスの利益率に絡む重要箇所なので、効率よりも`型の安全性`や`コードのメンテナンス性`を重視しています。
* デジスロやデジバチのようなギャンブル機とは異なり、抽選結果が分散されているため、確率を重視して抽選を行います。（射幸心を煽る仕掛けは含まれていません）


## 景品定義

景品には `WINS` と `LOSES` に分類され、それぞれ、`当選` と `落選` に対応します。
具体的には下記のように定義してください。（トランスパイルでエラーになるからといって、血迷っても `any` や `as` なんかは使わないでください。）

```ts
const wins = ["ハワイ旅行", "松", "竹", "梅"] as const;
const loses = ["ドリンクバー無料", "次回100円無料"] as const;
```

#### `WINS` と `LOSES` の違い

* `WINS` は在庫管理を行います。確率により当選可能商品だとしても、該当商品の在庫が存在しない場合には除外されます。
* `LOSES` は在庫管理を行いません。（`Repository<WINS, LOSES>`を参照）

## 抽選の設定

* `Configure<WINS, LOSES>` に`当選商品`、`落選商品`、`確率`などを保持します。
* `WINS` と `LOSES` を定義します。（内部では`ストリングリテラル型`とその`配列`で保持します）
* 各確率を定義します。（百分率ではないので、割合で定義して構いません）
* `gain` は内部で当選確率を算出するためのオフセット値になります。`0` 以上を指定してください。
* ヒストグラムの取得では、`ratioの合計数値` × `gain` 分のデータを取得します。したがって、`gain`を上げすぎると抽選処理のパフォーマンスに影響が出てきます。


```ts
import * as gacha from "@codianz/gacha";

const wins = ["gold", "silver", "bronze"] as const;
const loses = ["none1", "none2"] as const;

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
  1000
);
```

## データアクセス

* `Repository<WINS, LOSES>` に、`過去の抽選結果`、`現在の在庫数` の取得要求に対して応答するクラスです。
* `Repository<WINS, LOSES>` は `interface` なので、実装が必要です。
* 実際にはデータベースやストレージなどと連携することになります。

#### `getPastResultHistogram(n: number): Promise<{ [_ in WINS | LOSES]: number; }>`

直近 `n` 個のデータからヒストグラムを返却します。

#### `getStocks(): Promise<{ [_ in WINS]: number; }>`

* 現在の在庫数を返却します。
* これは`WINS`のみです。
* `LOSES` は在庫管理対象外です。
* 在庫管理を行わず、確率だけで管理する場合は、全て`1`以上の値を固定値として返却することで実現可能です。


```ts
import * as gacha from "@codianz/gacha";

class SampleRepo implements gacha.Repository<wins_t, loses_t> {
  private m_data: Array<wins_t | loses_t> = [];

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
};
```

## 抽選の実行

* `Engine<WINS, LOSES>`を生成して、`execute()`を実行します。 
* この `result` に応じて在庫数や、抽選記録を残すのはこのライブラリでは行いません。
* 抽選実施が同時に発生し在庫確保ができなかった場合は、再度、`execute()`を実行します。
* 非同期関数なので、リトライ処理は気をつけてね。

```ts
import * as gacha from "@codianz/gacha";

const engine = new gacha.Engine(config, repo);
engine.execute().then(result => {
  /** result に結果が入ります */
});
```