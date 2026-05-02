# ProofScholar: Blockchain Academic Integrity System

This is a demo MVP for the ISOM3036 blockchain application project. It proposes a novel academic integrity platform where papers, peer review records, and citation declarations are registered as tamper-resistant blockchain evidence.

## Why Blockchain

The application uses blockchain properties that match the course guideline:

- **Timestamping:** every submission, review, and citation declaration receives a verifiable time record.
- **Integrity:** manuscript and review content are represented by hashes, so the original file can be verified without storing private content on-chain.
- **Non-repudiation:** wallet addresses show who submitted each record.
- **Tamper resistance and immutability:** once a hash is registered, later edits cannot silently replace the record.
- **Transparency:** reviewers, instructors, and students can audit the lifecycle of a paper.

## MVP Pages

1. **Login / Wallet:** connect MetaMask and explain the blockchain value proposition.
2. **Paper Submission:** generate a SHA-256 content hash and register paper metadata.
3. **Paper Detail:** view paper evidence and submit hashed peer-review comments.
4. **Citation Tracker:** declare paper-to-paper citation relationships and visualize a citation graph.

## Project Structure

```text
contracts/AcademicIntegrityRegistry.sol  Solidity smart contract
scripts/deploy.js                        Hardhat deployment script
app/index.html                           Static frontend
app/styles.css                           UI styles
app/app.js                               Frontend logic and MetaMask integration
docs/project-analysis.md                 Presentation-oriented analysis
```

## Run the Demo

Open `app/index.html` in a browser. The demo works with local sample data even without MetaMask.

To deploy the contract later on Sepolia:

```bash
npm install
cp .env.example .env
npm run compile
npm run deploy:sepolia
```

After deployment, replace `contractAddress` in `app/app.js` with the deployed address.

## Demo Notes

The frontend currently stores demo records in browser `localStorage`. If `contractAddress` is changed from the zero address to a deployed contract address, the submit/review actions also send transactions through MetaMask.
