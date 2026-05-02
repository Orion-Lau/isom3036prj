// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AcademicIntegrityRegistry {
    struct Paper {
        uint256 id;
        address author;
        string title;
        string contentHash;
        string metadataURI;
        uint256 submittedAt;
        bool exists;
    }

    struct Review {
        address reviewer;
        string reviewHash;
        uint8 score;
        uint256 submittedAt;
    }

    struct Citation {
        uint256 citedPaperId;
        address declarer;
        uint256 declaredAt;
    }

    uint256 private nextPaperId = 1;

    mapping(uint256 => Paper) private papers;
    mapping(uint256 => Review[]) private reviewsByPaper;
    mapping(uint256 => Citation[]) private citationsByPaper;
    mapping(address => uint256[]) private papersByAuthor;
    mapping(bytes32 => bool) private usedContentHashes;

    event PaperSubmitted(
        uint256 indexed paperId,
        address indexed author,
        string title,
        string contentHash,
        uint256 submittedAt
    );
    event ReviewSubmitted(
        uint256 indexed paperId,
        address indexed reviewer,
        string reviewHash,
        uint8 score,
        uint256 submittedAt
    );
    event CitationDeclared(
        uint256 indexed paperId,
        uint256 indexed citedPaperId,
        address indexed declarer,
        uint256 declaredAt
    );

    function submitPaper(
        string calldata title,
        string calldata contentHash,
        string calldata metadataURI
    ) external returns (uint256 paperId) {
        require(bytes(title).length > 0, "Title is required");
        require(bytes(contentHash).length > 0, "Content hash is required");

        bytes32 hashKey = keccak256(bytes(contentHash));
        require(!usedContentHashes[hashKey], "Paper hash already registered");

        paperId = nextPaperId++;
        papers[paperId] = Paper({
            id: paperId,
            author: msg.sender,
            title: title,
            contentHash: contentHash,
            metadataURI: metadataURI,
            submittedAt: block.timestamp,
            exists: true
        });

        usedContentHashes[hashKey] = true;
        papersByAuthor[msg.sender].push(paperId);

        emit PaperSubmitted(paperId, msg.sender, title, contentHash, block.timestamp);
    }

    function submitReview(
        uint256 paperId,
        string calldata reviewHash,
        uint8 score
    ) external {
        require(papers[paperId].exists, "Paper does not exist");
        require(bytes(reviewHash).length > 0, "Review hash is required");
        require(score <= 100, "Score must be 0-100");
        require(msg.sender != papers[paperId].author, "Author cannot review own paper");

        reviewsByPaper[paperId].push(Review({
            reviewer: msg.sender,
            reviewHash: reviewHash,
            score: score,
            submittedAt: block.timestamp
        }));

        emit ReviewSubmitted(paperId, msg.sender, reviewHash, score, block.timestamp);
    }

    function declareCitation(uint256 paperId, uint256 citedPaperId) external {
        require(papers[paperId].exists, "Paper does not exist");
        require(papers[citedPaperId].exists, "Cited paper does not exist");
        require(paperId != citedPaperId, "Paper cannot cite itself");

        citationsByPaper[paperId].push(Citation({
            citedPaperId: citedPaperId,
            declarer: msg.sender,
            declaredAt: block.timestamp
        }));

        emit CitationDeclared(paperId, citedPaperId, msg.sender, block.timestamp);
    }

    function getPaper(uint256 paperId) external view returns (Paper memory) {
        require(papers[paperId].exists, "Paper does not exist");
        return papers[paperId];
    }

    function getReviews(uint256 paperId) external view returns (Review[] memory) {
        require(papers[paperId].exists, "Paper does not exist");
        return reviewsByPaper[paperId];
    }

    function getCitations(uint256 paperId) external view returns (Citation[] memory) {
        require(papers[paperId].exists, "Paper does not exist");
        return citationsByPaper[paperId];
    }

    function getPapersByAuthor(address author) external view returns (uint256[] memory) {
        return papersByAuthor[author];
    }

    function totalPapers() external view returns (uint256) {
        return nextPaperId - 1;
    }
}
