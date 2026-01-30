# スマートコントラクト ドキュメント

このドキュメントでは、ZeroKey Treasuryスマートコントラクトの包括的なドキュメントを提供します。

## 概要

スマートコントラクトレイヤーは、AI駆動のポリシー決定のオンチェーン強制を提供します。最終的なゲートキーパーとして機能し、ポリシーエンジンによって承認されていないトランザクションは拒否されます。

---

## ZeroKeyGuard.sol

**場所**: `packages/contracts/src/ZeroKeyGuard.sol`
**コンパイラ**: Solidity ^0.8.24
**ライセンス**: MIT

### 目的

ZeroKeyGuardは以下を行うメインガードコントラクトです：

1. オフチェーンAIポリシーエンジンからの承認決定を保存
2. トランザクション実行のための検証関数を提供
3. 監査証跡のためにイベントを発行

### 状態変数

| 変数                   | 型                         | 可視性 | 説明                                                     |
| ---------------------- | -------------------------- | ------ | -------------------------------------------------------- |
| `policyOracle`         | `address`                  | public | 決定送信権限を持つアドレス                               |
| `owner`                | `address`                  | public | 管理者権限を持つコントラクトオーナー                     |
| `approvedTransactions` | `mapping(bytes32 => bool)` | public | トランザクションハッシュから承認ステータスへのマッピング |

### 定数

| 定数          | 値  | 説明                   |
| ------------- | --- | ---------------------- |
| `LOW_RISK`    | `1` | 安全なトランザクション |
| `MEDIUM_RISK` | `2` | 注意が必要             |
| `HIGH_RISK`   | `3` | デフォルトでブロック   |

### 関数

#### `constructor(address _policyOracle)`

ポリシーオラクルアドレスでコントラクトを初期化します。

**効果**:

- `owner`を`msg.sender`に設定
- `policyOracle`を`_policyOracle`に設定
- `OwnershipTransferred(address(0), msg.sender)`を発行
- `PolicyOracleUpdated(address(0), _policyOracle)`を発行

**リバート**: `_policyOracle`がゼロアドレスの場合`InvalidAddress()`

---

#### `submitDecision(bytes32 txHash, bool approved, uint256 riskLevel, string calldata reason)`

トランザクションのポリシー決定を送信します。

| パラメータ  | 型        | 説明                                      |
| ----------- | --------- | ----------------------------------------- |
| `txHash`    | `bytes32` | トランザクションデータのKeccak256ハッシュ |
| `approved`  | `bool`    | トランザクションが承認されたかどうか      |
| `riskLevel` | `uint256` | リスクレベル (1-3)                        |
| `reason`    | `string`  | 人間が読める説明                          |

**アクセス**: `onlyPolicyOracle`

**効果**:

- `approvedTransactions[txHash] = approved`を設定
- `TransactionApproved`または`TransactionRejected`を発行

---

#### `isApproved(bytes32 txHash) → bool`

トランザクションが承認されているかどうかを確認します。

**戻り値**: `bool` - 承認されていればtrue、そうでなければfalse

---

#### `validateTransaction(bytes32 txHash)`

トランザクションを検証し、未承認の場合はリバートします。

**リバート**: 未承認の場合`TransactionNotApproved()`

---

### イベント

#### `TransactionApproved`

```solidity
event TransactionApproved(bytes32 indexed txHash, uint256 riskLevel, string reason);
```

トランザクションが承認されたときに発行されます。

#### `TransactionRejected`

```solidity
event TransactionRejected(bytes32 indexed txHash, uint256 riskLevel, string reason);
```

トランザクションが拒否されたときに発行されます。

---

### エラー

| エラー                     | 説明                                           |
| -------------------------- | ---------------------------------------------- |
| `Unauthorized()`           | 呼び出し元がこのアクションの権限を持っていない |
| `TransactionNotApproved()` | トランザクションが承認されていない             |
| `InvalidAddress()`         | アドレスパラメータがゼロアドレス               |

---

## デプロイ

### ローカル開発

```bash
cd packages/contracts

# ローカルAnvilノードを起動
anvil

# ローカルにデプロイ
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### テストネットデプロイ

```bash
# Base Sepolia
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Optimism Sepolia
forge script script/Deploy.s.sol \
  --rpc-url $OPTIMISM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

---

## テスト

### テストの実行

```bash
cd packages/contracts

# すべてのテスト
forge test

# 詳細出力
forge test -vvvv

# ガスレポート
forge test --gas-report

# カバレッジ
forge coverage
```

### 主要なテストケース

| テスト                              | 説明                             |
| ----------------------------------- | -------------------------------- |
| `testSubmitDecision`                | オラクルが有効な決定を送信できる |
| `testUnauthorizedSubmit`            | 非オラクルは送信できない         |
| `testValidateApprovedTransaction`   | 承認済みtxは検証を通過           |
| `testValidateUnapprovedTransaction` | 未承認txはリバート               |

---

## セキュリティ考慮事項

### 信頼モデル

1. **オーナー** - ポリシーオラクルを更新可能、所有権を移転可能
2. **ポリシーオラクル** - 決定を送信できる唯一のアドレス
3. **ユーザー** - 承認ステータスをクエリ可能

### 攻撃ベクトルと緩和策

| 攻撃               | 緩和策                               |
| ------------------ | ------------------------------------ |
| 不正な決定送信     | `onlyPolicyOracle`モディファイア     |
| オラクルキーの侵害 | オーナーがオラクルアドレスを更新可能 |
| ゼロアドレス脆弱性 | `InvalidAddress()`チェック           |

### 監査ステータス

⚠️ このコントラクトは正式な監査を受けていません。メインネットでの使用は自己責任で行ってください。

---

## 関連ドキュメント

- [アーキテクチャ概要](../architecture/overview.md)
- [バックエンドドキュメント](backend.md)
