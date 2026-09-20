# Pi Dev Workflow Extensions

[pi](https://github.com/earendil-works/pi) のプロジェクトローカル拡張機能セットです。要件定義フロー（`/req`）、TDDワークフロー（`/tdd`）、レビュー指摘の修正フロー（`/fix`）、および多モデルディスカッション（`/discussion`）を提供します。

## 機能概要

| コマンド | 説明 |
|---------|------|
| `/req` | 要件定義フロー（独立拡張）。 clarifier が質問対話で要件を明確化 → documenter / architect が要件定義書・アーキテクチャ概要・GitHub Issue を作成 |
| `/tdd` | TDDフロー。Red-Green-Refactor サイクルを強制し、自動テスト実行（失敗時は「診断→自動修正→再テスト」を最大3回）と3視点レビュー、PR作成 |
| `/discussion <議題>` | 3モデル＋1マージモデルでのパネルディスカッション（2ラウンド制） |
| `/discussion-config` | ディスカッション参加モデルを設定 |
| `/subagent-config` | `/req`・`/tdd` のサブエージェントモデルを設定・確認 |
| `/fix` | レビュー指摘に基づく修正フロー。start / approve / test / review / status / reset |

> **root の `package.json` について**
>
> ワークフロー（`/tdd`・`/fix`）はテストコマンドを自動検出し、既定では `npm test` を実行します。
> root の `package.json` はその `npm test` を `dotnet test` に中継するアダプタとして必須のため削除しないでください（`.NET` アプリ本体のテストは `tests/` の xUnit プロジェクトが担います）。

## クイックスタート

```bash
# 1. リポジトリをclone
git clone <repository-url> my-project
cd my-project

# 2. 個人設定ファイルをコピー
cp .pi/subagent-config.json.example .pi/subagent-config.json
cp .pi/discussion-config.json.example .pi/discussion-config.json

# 3. 必要に応じてモデルを編集（任意）
# nano .pi/subagent-config.json

# 4. pi を起動し、プロジェクトを trust して拡張を有効化
pi
```

## セットアップ詳細

### 前提条件

- [pi](https://github.com/earendil-works/pi) がインストールされていること
- `gh` CLI がインストールされていること（`/req` の GitHub Issue 自動作成に必要）
- 各種AIモデルのAPIキーが pi に設定されていること

### モデル設定

サブエージェント（要件定義・TDDの各工程）に使用するモデルは、以下の優先順位で解決されます：

```
環境変数 PI_MODEL_<ROLE> > .pi/subagent-config.json > レガシー環境変数 > デフォルト（子piの設定）
```

#### 方法1: 設定ファイル（推奨）

```bash
cp .pi/subagent-config.json.example .pi/subagent-config.json
# エディタで各ロールのモデルを指定（/subagent-config で確認・編集も可）
```

#### 方法2: 環境変数

```bash
# 要件定義のロール
# clarifier / documenter / architect
export PI_MODEL_CLARIFIER="opencode-go/deepseek-v4-flash"
export PI_MODEL_DOCUMENTER="opencode-go/gpt-5.6-luna"
export PI_MODEL_ARCHITECT="opencode-go/deepseek-v4-pro"

# TDDのロール
# issueAnalyzer / codebaseScout / tddPlanner / testDiagnoser / testFixer / reviewer / fixPlanner
export PI_MODEL_ISSUE_ANALYZER="opencode-go/glm-5.3-flash"
export PI_MODEL_CODEBASE_SCOUT="opencode-go/deepseek-v4-flash"
export PI_MODEL_TDD_PLANNER="opencode-go/mimo-v2.5-pro"
export PI_MODEL_TEST_DIAGNOSER="opencode-go/mimo-v2.5-pro"
export PI_MODEL_TEST_FIXER="opencode-go/deepseek-v4-pro"
export PI_MODEL_REVIEWER="opencode-go/gpt-5.6-luna"
export PI_MODEL_FIX_PLANNER="opencode-go/deepseek-v4-pro"
```

### ディスカッション設定

```bash
cp .pi/discussion-config.json.example .pi/discussion-config.json
# または pi 内で対話的に設定
/discussion-config
```

## 使い方

### 要件定義 → TDD の一連の流れ

```
# 1. 要件定義開始
/req start "ECサイトのカート機能"

# 2. clarifier（軽量モデル）が質問を繰り返す → 回答
# 3. 要件が明確になったら
/req done

# 4. REQUIREMENTS.md / ARCHITECTURE.md が作成され、
#    要件が1〜8個の独立した GitHub Issue に分割登録される
# 5. 作成された Issue URL を使って TDD 開始
/tdd start https://github.com/owner/repo/issues/123
```

### 要件定義（`/req`）

```
/req start "<テーマ>"   # 要件定義開始（clarifier が質問対話を実施）
/req done               # 要件明確化完了 → 要件定義書・アーキテクチャ・Issue 作成
/req status             # 状態確認
/req reset              # リセット
/req models             # 使用モデルを表示
```

### TDD フェーズ遷移

```
/tdd start <issue-url>     # 課題分析・コード調査・プラン作成
/tdd approve               # プラン承認 → RED フェーズ（失敗するテストを書く）
/tdd test                  # テスト実行 → 自動遷移（RED: 想定通り失敗 → GREEN へ）
/tdd test                  # 再テスト（GREEN: 成功 → REFACTOR へ）
/tdd review                # 3視点レビュー（セキュリティ・パフォーマンス・保守性）
/tdd pr                    # issue 単位の PR 作成（自動 push + gh pr create）
```

- **自動遷移**: `/tdd test` の結果でフェーズが自動的に進みます（REDで失敗確認 → GREEN / GREENで成功確認 → REFACTOR）
- **自動修正**: `/tdd test` 失敗時は「診断 → 自動修正 → 再テスト」を最大3回自動実行し、3回連続で失敗したら人間へエスカレーション
- **手動遷移**: `green` / `refactor` は必要に応じて手動実行も可能
- **その他のサブコマンド**: `guide`（フロー図を再表示）/ `status` / `models` / `reset`

利用可能: `start` `approve` `green` `refactor` `test` `review` `pr` `guide` `status` `models` `reset`

### 修正フロー（`/fix`）

TDDレビュー指摘やテスト失敗後の修正を独立して実行します。

```
/fix start                 # 直前のTDDレビュー指摘を自動読み込み
/fix start <description>   # 明示的に指摘を指定して開始
/fix approve               # 修正プラン承認 → FIXINGフェーズ（編集可）
/fix test                  # テスト実行
/fix review                # 多角的レビュー
/fix status                # 状態確認
/fix reset                 # リセット
```

指摘の読み込み優先順位:
1. コマンド引数 (`/fix start <description>`)
2. TDDセッションのレビュー結果（直前の `/tdd review` フィードバック）
3. フォールバックファイル: `.pi/fix-input.md`, `.pi/last-feedback.md`, `FIX_INPUT.md`

## ディレクトリ構成

```
.
├── .pi/
│   ├── extensions/              # 拡張機能（TypeScript）
│   │   ├── lib/
│   │   │   ├── subagent-models.ts   # モデル解決ユーティリティ
│   │   │   └── ui-progress.ts       # 進捗表示ユーティリティ
│   │   ├── requirements.ts      # /req コマンド
│   │   ├── tdd-orchestrator.ts  # /tdd コマンド
│   │   ├── fix-orchestrator.ts  # /fix コマンド
│   │   ├── discussion.ts        # /discussion, /discussion-config
│   │   ├── subagent-config.ts   # /subagent-config
│   │   └── opencodego-footer.ts # ステータスバー拡張
│   ├── skills/
│   │   └── tdd-workflow/
│   │       └── SKILL.md         # LLM用ワークフロー説明
│   ├── subagent-config.json.example    # サブエージェント設定テンプレート
│   └── discussion-config.json.example  # ディスカッション設定テンプレート
├── AGENTS.md                    # エージェント向けワークスペース説明
├── README.md                    # このファイル
└── LICENSE                      # MIT License
```

## 規約・注意事項

- `.pi/extensions/` はプロジェクトローカル拡張機能です。pi 起動時にプロジェクトを **trust** する必要があります。
- `/tdd` の編集ゲート（ファイル編集制限）は、承認後の実装フェーズ（red/green/refactor/testing/review/escalated）でのみ有効です。idle 中は通常の作業・`/req` とも独立して編集可能です。
- プランやレビュー指摘の全文は親セッションの履歴を肥大化させないため、ファイル（`.pi/tdd-plan.md` / `.pi/tdd-review.md` / `.pi/fix-plan.md` / `.pi/fix-review.md`）に保存し、UI には要約のみ通知します。
- `/discussion` の出力は `./discussion/<議題>/round1|round2/<モデル名>.md` と `merged.md` に保存されます。モデル間の共有はインメモリ（プロンプト内）で行われ、ファイルは参照されません。ディスカッション設定が未設定の場合、`/discussion-config` の実行を案内します。
- `subagent-config.json` と `discussion-config.json` は個人設定のため `.gitignore` に含まれています。clone後は `.example` からコピーして使ってください。

## ライセンス

MIT
