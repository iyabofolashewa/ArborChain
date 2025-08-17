# ArborChain
A blockchain-powered environmental conservation platform that incentivizes and verifies reforestation efforts, rewarding communities for planting and maintaining trees while ensuring transparency and accountability.

---

## Overview
ArborChain is a decentralized platform built on the Stacks blockchain using Clarity smart contracts. It addresses the challenge of ensuring reforestation projects are transparent, verifiable, and financially sustainable. By integrating satellite imagery, IoT sensor data, and community participation, ArborChain rewards tree planting and maintenance with tokens, fosters global investment in conservation, and provides immutable proof of environmental impact.

The platform consists of four main smart contracts:
1. **TreeToken Contract** – Issues and manages tokens rewarded for verified tree planting and maintenance.
2. **Verification Oracle Contract** – Integrates off-chain data (e.g., satellite imagery, IoT sensors) to confirm tree planting and survival.
3. **Reward Distribution Contract** – Automates token rewards for communities based on verified conservation efforts.
4. **Investment Pool Contract** – Enables global investors to fund reforestation projects and earn returns from carbon credit sales.

---

## Features
- **TreeToken rewards** for planting and maintaining trees, redeemable for goods or services.
- **Transparent verification** using satellite and IoT data to ensure trees are planted and thriving.
- **Automated reward distribution** to communities based on verified milestones (e.g., tree survival rates).
- **Crowdfunded investment** allowing individuals or organizations to fund reforestation and share in carbon credit profits.
- **Immutable impact tracking** for donors, governments, and NGOs to monitor project outcomes.
- **Community empowerment** by providing financial incentives for local conservation efforts.

---

## Smart Contracts

### TreeToken Contract
- Mints and manages `TREE` tokens, awarded to communities for verified tree planting and maintenance.
- Supports token transfers, staking for governance, and redemption for local goods/services.
- Includes mechanisms to prevent inflation (e.g., capped token supply).

### Verification Oracle Contract
- Integrates with off-chain data sources (e.g., satellite imagery, IoT soil sensors) to verify tree planting and survival.
- Provides secure, tamper-proof data feeds for reward calculations.
- Allows community submissions of planting evidence, validated by trusted third parties.

### Reward Distribution Contract
- Automates `TREE` token payouts based on verified planting and maintenance milestones (e.g., 6-month tree survival).
- Supports tiered rewards (higher tokens for longer-term tree care).
- Tracks reward history for transparency and auditing.

### Investment Pool Contract
- Enables investors to fund reforestation projects by purchasing investment tokens.
- Distributes profits from carbon credit sales to investors via smart contracts.
- Logs all investments and payouts on-chain for transparency.

---

## Installation
1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started) for Stacks development.
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/arborchain.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests:
   ```bash
   clarinet test
   ```
5. Deploy contracts to the Stacks blockchain:
   ```bash
   clarinet deploy
   ```

## Usage
Each smart contract is modular but interoperates to form the ArborChain ecosystem. Communities interact with the platform via a dApp to submit planting data and claim rewards. Investors use the dApp to fund projects and track returns. Refer to individual contract documentation for specific function calls, parameters, and integration details.

- **TreeToken Contract**: Use `mint` to issue tokens, `transfer` for community exchanges, or `redeem` for goods.
- **Verification Oracle Contract**: Call `submit-evidence` for planting data or `verify-data` for oracle updates.
- **Reward Distribution Contract**: Trigger `distribute-rewards` after verification milestones.
- **Investment Pool Contract**: Use `invest` to fund projects and `claim-returns` for carbon credit profits.

## License
MIT License