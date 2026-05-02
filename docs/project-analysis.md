# Project Analysis: Academic Integrity Chain

## Application Gap

Most blockchain education examples focus on supply chain, finance, healthcare, or digital identity. Academic integrity is a strong missing domain because universities need trusted records for authorship, submission time, peer review, and citation provenance.

## Proposed Novel Application

ProofScholar is a blockchain-based academic integrity system. Students submit a paper hash instead of the full paper. Reviewers submit a review hash. Authors declare citation relationships between papers. The platform creates a verifiable evidence trail without exposing private academic content.

## Stakeholders

- Students prove when a paper was submitted and whether later versions match the original hash.
- Instructors audit authorship, originality checks, reviews, and citation history.
- Reviewers keep review text private while proving that a review existed at a specific time.
- Universities gain a transparent and tamper-resistant academic record.

## Blockchain Characteristics Used

| Characteristic | How ProofScholar Uses It |
| --- | --- |
| Timestamping | Records submission, review, and citation declaration time. |
| Immutability | Prevents silent alteration of paper or review evidence. |
| Integrity | Hashes verify that paper and review content has not changed. |
| Non-repudiation | Wallet addresses link actions to submitters. |
| Transparency | Citation and review trails can be audited by authorized users. |
| Decentralized data store | Evidence can be kept independently from one school database. |

## Why It Is Feasible

The MVP has clear business logic:

1. Submit paper hash.
2. Submit peer-review hash.
3. Declare citation relationships.
4. View paper evidence, review records, and citation graph.

The system can be demonstrated with a small Solidity contract, a static frontend, MetaMask, and Sepolia testnet deployment.

## Limitations and Future Extensions

- AI detection is represented as a score in the MVP; a production version could call GPTZero, Turnitin, or another API.
- Full access control is not implemented in the demo; future versions could add instructor roles.
- Paper files are not uploaded in the MVP; future versions could store encrypted files on IPFS and keep only IPFS CIDs on-chain.
- Privacy needs careful design because public chains expose metadata.
