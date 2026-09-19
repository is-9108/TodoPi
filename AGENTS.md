# AGENTS.md

このワークスペースは pi の拡張開発・検証用。以下はインストール済みの拡張コマンド。

## コマンド

| コマンド | 説明 |
|---------|------|
| `/req` | 要件定義フロー（独立拡張）。start / done / status / reset / models |
| `/tdd` | TDD フロー。start / approve / red / green / refactor / test / review / pr / status / reset |
| `/discussion <議題>` | 3モデル+1マージモデルのディスカッション |
| `/discussion-config` | ディスカッション参加モデルを設定 |
| `/subagent-config` | /req・/tdd のサブエージェントモデルを設定 |
| `/fix` | レビュー指摘に基づく修正フロー。start / approve / test / review / status / reset |

## 規約

- **編集ゲート**: `/tdd` は承認後の実装フェーズ（red/green/refactor/testing/review/escalated）でのみ `write`/`edit` を制限する。idle 中は通常の作業・`/req` とも独立して編集可能。
- **ディスカッション設定**: `.pi/discussion-config.json`。未設定なら `/discussion-config` を案内する。
- **ディスカッション出力**: `./discussion/<議題>/round1|round2/<モデル名>.md` と `merged.md`。モデルはこのファイルを参照せず、共有はインメモリ（プロンプト内）で行う。
- **修正フロー**: `/fix` は `/tdd review` やテスト失敗後の修正を独立して扱う。指摘を読み込み → 修正プラン作成 → ユーザー承認 → 修正実行 → テスト → 多角的レビュー。

## モデル設定

サブエージェントのモデルは config ファイルか環境変数で指定。`/subagent-config` で設定・確認できる。

優先順位: `PI_MODEL_<ROLE>` 環境変数 > `.pi/subagent-config.json` > レガシー環境変数 > デフォルト（子 pi の設定）

- 要件定義のロール: clarifier / documenter / architect（旧: `PI_REQ_FLASH_MODEL` / `PI_REQ_HIGH_MODEL`）
- TDD のロール: issueAnalyzer / codebaseScout / tddPlanner / testDiagnoser / testFixer / reviewer / fixPlanner

詳細は `.pi/skills/tdd-workflow/SKILL.md`。
