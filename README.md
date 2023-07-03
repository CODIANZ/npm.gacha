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


## 実行結果サンプル

### 在庫数未指定・試行回数`連続1,000,000` x `10回`

| 商品  | 種別  | 当選割合  | 在庫数  |
| - | -  | - | - |
|gold   | WINS  |  1 | 未指定 |
|silver | WINS  | 20 | 未指定 |
|bronze | WINS  | 30 | 未指定 |
|none1  | LOSES | 20 | 未指定 |
|none2  | LOSES | 50 | 未指定 |

```
stock unmanaged
ideal {gold: 0.008264462809917356, silver: 0.1652892561983471, bronze: 0.24793388429752067, none1: 0.1652892561983471, none2: 0.4132231404958678}
count#1 {gold: 8281, silver: 165296, bronze: 247926, none1: 165292, none2: 413205}
ratio#1 {gold: 0.008281, silver: 0.165296, bronze: 0.247926, none1: 0.165292, none2: 0.413205}
count#2 {gold: 8279, silver: 165289, bronze: 247931, none1: 165292, none2: 413209}
ratio#2 {gold: 0.008279, silver: 0.165289, bronze: 0.247931, none1: 0.165292, none2: 0.413209}
count#3 {gold: 8279, silver: 165294, bronze: 247928, none1: 165291, none2: 413208}
ratio#3 {gold: 0.008279, silver: 0.165294, bronze: 0.247928, none1: 0.165291, none2: 0.413208}
count#4 {gold: 8278, silver: 165290, bronze: 247929, none1: 165293, none2: 413210}
ratio#4 {gold: 0.008278, silver: 0.16529, bronze: 0.247929, none1: 0.165293, none2: 0.41321}
count#5 {gold: 8283, silver: 165291, bronze: 247930, none1: 165292, none2: 413204}
ratio#5 {gold: 0.008283, silver: 0.165291, bronze: 0.24793, none1: 0.165292, none2: 0.413204}
count#6 {gold: 8281, silver: 165295, bronze: 247930, none1: 165290, none2: 413204}
ratio#6 {gold: 0.008281, silver: 0.165295, bronze: 0.24793, none1: 0.16529, none2: 0.413204}
count#7 {gold: 8278, silver: 165290, bronze: 247932, none1: 165295, none2: 413205}
ratio#7 {gold: 0.008278, silver: 0.16529, bronze: 0.247932, none1: 0.165295, none2: 0.413205}
count#8 {gold: 8279, silver: 165291, bronze: 247932, none1: 165293, none2: 413205}
ratio#8 {gold: 0.008279, silver: 0.165291, bronze: 0.247932, none1: 0.165293, none2: 0.413205}
count#9 {gold: 8282, silver: 165290, bronze: 247933, none1: 165290, none2: 413205}
ratio#9 {gold: 0.008282, silver: 0.16529, bronze: 0.247933, none1: 0.16529, none2: 0.413205}
count#10 {gold: 8278, silver: 165294, bronze: 247928, none1: 165291, none2: 413209}
ratio#10 {gold: 0.008278, silver: 0.165294, bronze: 0.247928, none1: 0.165291, none2: 0.413209}
```

### 在庫数指定・試行回数`連続1,000,000` x `10回`

| 商品  | 種別  | 当選割合  | 在庫数  |
| - | -  | - | - |
|gold   | WINS  |  1 | 1 |
|silver | WINS  | 20 | 20 |
|bronze | WINS  | 30 | 30 |
|none1  | LOSES | 20 | 未指定 |
|none2  | LOSES | 50 | 未指定 |

```
stock managed
ideal {gold: 0.008264462809917356, silver: 0.1652892561983471, bronze: 0.24793388429752067, none1: 0.1652892561983471, none2: 0.4132231404958678}
count#1 {gold: 1, silver: 20, bronze: 30, none1: 165318, none2: 412908}
ratio#1 {gold: 0.0000017292750705976547, silver: 0.0000345855014119531, bronze: 0.00005187825211792964, none1: 0.2858802961210631, none2: 0.7140315108503364}
count#2 {gold: 1, silver: 20, bronze: 30, none1: 165402, none2: 413542}
ratio#2 {gold: 0.0000017271306315253154, silver: 0.00003454261263050631, bronze: 0.00005181391894575946, none1: 0.2856708607155502, none2: 0.7142410556222419}
count#3 {gold: 1, silver: 20, bronze: 30, none1: 166016, none2: 412474}
ratio#3 {gold: 0.0000017284859672866746, silver: 0.00003456971934573349, bronze: 0.00005185457901860024, none1: 0.28695632634506457, none2: 0.7129555208706038}
count#4 {gold: 1, silver: 20, bronze: 30, none1: 165577, none2: 413455}
ratio#4 {gold: 0.0000017268681691570983, silver: 0.00003453736338314197, bronze: 0.00005180604507471295, none1: 0.2859296508445249, none2: 0.7139822788788481}
count#5 {gold: 1, silver: 20, bronze: 30, none1: 165870, none2: 413538}
ratio#5 {gold: 0.000001725747637020048, silver: 0.00003451495274040096, bronze: 0.00005177242911060144, none1: 0.2862497605525154, none2: 0.7136622263179966}
count#6 {gold: 1, silver: 20, bronze: 30, none1: 165140, none2: 413264}
ratio#6 {gold: 0.0000017287429445678574, silver: 0.00003457485889135715, bronze: 0.000051862288337035725, none1: 0.285484609865936, none2: 0.714427224243891}
count#7 {gold: 1, silver: 20, bronze: 30, none1: 165262, none2: 412960}
ratio#7 {gold: 0.000001729287032249474, silver: 0.00003458574064498948, bronze: 0.00005187861096748421, none1: 0.2857854335236126, none2: 0.7141263728377427}
count#8 {gold: 1, silver: 20, bronze: 30, none1: 165044, none2: 413559}
ratio#8 {gold: 0.0000017281484272121164, silver: 0.000034562968544242325, bronze: 0.000051844452816363494, none1: 0.28522052902079653, none2: 0.7146913354094157}
count#9 {gold: 1, silver: 20, bronze: 30, none1: 166007, none2: 412511}
ratio#9 {gold: 0.0000017284023167504654, silver: 0.00003456804633500931, bronze: 0.000051852069502513964, none1: 0.2869268833967945, none2: 0.7129849680850512}
count#10 {gold: 1, silver: 20, bronze: 30, none1: 165327, none2: 413936}
ratio#10 {gold: 0.0000017261795848192862, silver: 0.00003452359169638572, bronze: 0.00005178538754457859, none1: 0.28538409221941813, none2: 0.7145278726217561}
```