const contractAddress = "0x0000000000000000000000000000000000000000";
const zeroAddress = "0x0000000000000000000000000000000000000000";
const storageVersion = 3;
const sepoliaChainId = "0xaa36a7";

const contractAbi = [
  "function submitPaper(string title,string contentHash,string metadataURI) returns (uint256)",
  "function submitReview(uint256 paperId,string reviewHash,uint8 score)",
  "function declareCitation(uint256 paperId,uint256 citedPaperId)",
  "function totalPapers() view returns (uint256)",
  "function getPaper(uint256 paperId) view returns (tuple(uint256 id,address author,string title,string contentHash,string metadataURI,uint256 submittedAt,bool exists))",
  "function getReviews(uint256 paperId) view returns (tuple(address reviewer,string reviewHash,uint8 score,uint256 submittedAt)[])",
  "function getCitations(uint256 paperId) view returns (tuple(uint256 citedPaperId,address declarer,uint256 declaredAt)[])"
];

const state = {
  account: "",
  provider: null,
  signer: null,
  contract: null,
  papers: [],
  reviews: {},
  citations: []
};

const els = {
  walletDot: document.querySelector("#walletDot"),
  walletStatus: document.querySelector("#walletStatus"),
  networkStatus: document.querySelector("#networkStatus"),
  modeBanner: document.querySelector("#modeBanner"),
  modeDescription: document.querySelector("#modeDescription"),
  modePill: document.querySelector("#modePill"),
  connectWallet: document.querySelector("#connectWallet"),
  submitPaperButton: document.querySelector("#submitPaperButton"),
  seedDemo: document.querySelector("#seedDemo"),
  paperForm: document.querySelector("#paperForm"),
  paperSelect: document.querySelector("#paperSelect"),
  paperDetail: document.querySelector("#paperDetail"),
  deletePaper: document.querySelector("#deletePaper"),
  reviewForm: document.querySelector("#reviewForm"),
  reviewList: document.querySelector("#reviewList"),
  citationForm: document.querySelector("#citationForm"),
  citationSource: document.querySelector("#citationSource"),
  citationTarget: document.querySelector("#citationTarget"),
  citationGraph: document.querySelector("#citationGraph"),
  citationList: document.querySelector("#citationList"),
  citationMessage: document.querySelector("#citationMessage"),
  submitMessage: document.querySelector("#submitMessage")
};

function nowStamp() {
  return new Date().toISOString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function short(value) {
  if (!value) return "";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function txLink(txHash) {
  if (!txHash) return "";
  const safeHash = escapeHtml(txHash);
  return `<p>Evidence transaction: <a class="hash" href="https://sepolia.etherscan.io/tx/${safeHash}" target="_blank" rel="noreferrer">${safeHash}</a></p>`;
}

function bufferToHex(buffer) {
  return `0x${Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function sha256Text(input) {
  const bytes = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return bufferToHex(buffer);
}

async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(digest);
}

function saveLocal() {
  localStorage.setItem("proofScholarState", JSON.stringify({
    version: storageVersion,
    papers: state.papers,
    reviews: state.reviews,
    citations: state.citations
  }));
}

function loadLocal() {
  const raw = localStorage.getItem("proofScholarState");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== storageVersion) {
      localStorage.removeItem("proofScholarState");
      return;
    }
    state.papers = parsed.papers || [];
    state.reviews = parsed.reviews || {};
    state.citations = parsed.citations || [];
  } catch {
    localStorage.removeItem("proofScholarState");
  }
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#view-${name}`).classList.add("active");
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === name);
  });
}

function updateWalletUi() {
  const connected = Boolean(state.account);
  els.walletDot.classList.toggle("connected", connected);
  els.walletStatus.textContent = connected ? short(state.account) : "Wallet not connected";
  els.connectWallet.textContent = connected ? "Wallet Connected" : "Connect MetaMask";
  els.modeBanner.classList.toggle("connected", connected);
  els.modeBanner.querySelector("strong").textContent = connected
    ? "Sepolia Evidence Transaction Mode"
    : "Local Demo Mode";
  els.modeDescription.textContent = connected
    ? "Paper, review, and citation submissions will request a MetaMask transaction and save an Etherscan link."
    : "Connect MetaMask to enable Sepolia evidence transactions.";
  els.modePill.textContent = connected ? "Wallet Connected" : "No Wallet";
  els.submitPaperButton.textContent = connected
    ? "Generate Hash and Register on Sepolia"
    : "Generate Hash and Register Locally";
}

async function connectWallet() {
  if (!window.ethereum || !window.ethers) {
    els.networkStatus.textContent = "MetaMask is not available in this browser";
    window.alert("MetaMask was not detected. Open this GitHub Pages website in Chrome, Edge, or Brave after installing and unlocking the MetaMask extension.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    state.account = accounts[0];
    state.provider = new ethers.BrowserProvider(window.ethereum);
    state.signer = await state.provider.getSigner();
    const network = await state.provider.getNetwork();
    const networkName = network.chainId === 11155111n ? "Sepolia" : `Chain ID ${network.chainId.toString()}`;
    els.networkStatus.textContent = contractAddress === zeroAddress
      ? `${networkName} connected; evidence transaction mode`
      : `${networkName} connected; contract ready`;

    if (contractAddress !== zeroAddress) {
      state.contract = new ethers.Contract(contractAddress, contractAbi, state.signer);
    }

    updateWalletUi();
  } catch (error) {
    els.networkStatus.textContent = `Wallet connection cancelled or failed`;
    console.error(error);
  }
}

async function ensureSepolia() {
  if (!window.ethereum) return;

  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === sepoliaChainId) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: sepoliaChainId }]
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: sepoliaChainId,
        chainName: "Sepolia",
        nativeCurrency: {
          name: "Sepolia ETH",
          symbol: "ETH",
          decimals: 18
        },
        rpcUrls: ["https://rpc.sepolia.org"],
        blockExplorerUrls: ["https://sepolia.etherscan.io"]
      }]
    });
  }
}

function utf8ToHex(input) {
  const bytes = new TextEncoder().encode(input);
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function sendEvidenceTransaction(kind, payload) {
  if (!state.account || state.contract) return "";

  await ensureSepolia();
  els.networkStatus.textContent = "Waiting for MetaMask transaction confirmation...";
  const evidence = JSON.stringify({
    app: "ProofScholar",
    kind,
    payload,
    createdAt: nowStamp()
  });
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: state.account,
      to: state.account,
      value: "0x0",
      data: utf8ToHex(evidence)
    }]
  });
  els.networkStatus.textContent = `Sepolia evidence tx: ${short(txHash)}`;
  return txHash;
}

function updateEnvironmentHint() {
  if (!window.ethereum) {
    els.networkStatus.textContent = window.location.protocol === "file:"
      ? "Open the GitHub Pages website in Chrome/Edge for MetaMask"
      : "MetaMask extension not detected";
  }
}

async function getPaperHash(title, author, content, file) {
  if (file) {
    return {
      contentHash: await sha256File(file),
      sourceType: "file",
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || "unknown"
    };
  }

  if (!content.trim()) {
    throw new Error("Upload a manuscript file or enter abstract/demo text.");
  }

  return {
    contentHash: await sha256Text(`${title}\n${author}\n${content}`),
    sourceType: "text",
    fileName: "",
    fileSize: 0,
    fileType: "text/plain"
  };
}

async function submitPaper(event) {
  event.preventDefault();
  els.submitMessage.textContent = "Generating hash...";

  try {
    const title = document.querySelector("#paperTitle").value.trim();
    const author = document.querySelector("#paperAuthor").value.trim();
    const content = document.querySelector("#paperContent").value.trim();
    const file = document.querySelector("#paperFile").files[0];
    const aiScore = Number(document.querySelector("#aiScore").value);
    const hashData = await getPaperHash(title, author, content, file);
    const id = state.papers.length + 1;
    const timestamp = nowStamp();

    if (state.contract) {
      els.submitMessage.textContent = "Waiting for MetaMask transaction...";
      const metadata = JSON.stringify({
        author,
        aiScore,
        sourceType: hashData.sourceType,
        fileName: hashData.fileName,
        fileSize: hashData.fileSize,
        fileType: hashData.fileType
      });
      const tx = await state.contract.submitPaper(title, hashData.contentHash, metadata);
      const receipt = await tx.wait();
      hashData.txHash = receipt.hash || receipt.transactionHash || tx.hash;
    } else if (state.account) {
      els.submitMessage.textContent = "Waiting for MetaMask evidence transaction...";
      hashData.txHash = await sendEvidenceTransaction("paper", {
        title,
        author,
        contentHash: hashData.contentHash,
        sourceType: hashData.sourceType,
        fileName: hashData.fileName,
        aiScore
      });
    }

    state.papers.push({
      id,
      title,
      author,
      contentHash: hashData.contentHash,
      sourceType: hashData.sourceType,
      fileName: hashData.fileName,
      fileSize: hashData.fileSize,
      fileType: hashData.fileType,
      txHash: hashData.txHash || "",
      aiScore,
      owner: state.account || "demo-wallet",
      timestamp
    });
    state.reviews[id] = [];
    saveLocal();
    renderAll();
    els.submitMessage.textContent = `Paper #${id} registered`;
    event.target.reset();
    document.querySelector("#aiScore").value = 86;
    switchView("detail");
  } catch (error) {
    els.submitMessage.textContent = error.message || "Submission failed";
    console.error(error);
  }
}

async function submitReview(event) {
  event.preventDefault();
  const paperId = Number(els.paperSelect.value);
  if (!paperId) return;

  let reviewTxHash = "";
  const reviewer = document.querySelector("#reviewerName").value.trim();
  const text = document.querySelector("#reviewText").value.trim();
  const score = Number(document.querySelector("#reviewScore").value);
  const reviewHash = await sha256Text(`${paperId}\n${reviewer}\n${text}\n${score}`);

  if (state.contract) {
    const tx = await state.contract.submitReview(paperId, reviewHash, score);
    const receipt = await tx.wait();
    reviewTxHash = receipt.hash || receipt.transactionHash || tx.hash;
  } else if (state.account) {
    reviewTxHash = await sendEvidenceTransaction("review", {
      paperId,
      reviewer,
      reviewHash,
      score
    });
  }

  state.reviews[paperId] ||= [];
  state.reviews[paperId].push({
    reviewer,
    score,
    reviewHash,
    txHash: reviewTxHash || "",
    timestamp: nowStamp()
  });

  saveLocal();
  renderAll();
  event.target.reset();
  document.querySelector("#reviewScore").value = 82;
}

async function submitCitation(event) {
  event.preventDefault();
  const source = Number(els.citationSource.value);
  const target = Number(els.citationTarget.value);
  els.citationMessage.textContent = "";

  if (!source || !target) {
    els.citationMessage.textContent = "Please load demo data or submit at least two papers first.";
    return;
  }

  if (source === target) {
    els.citationMessage.textContent = "Please choose two different papers. A paper cannot cite itself.";
    return;
  }

  let citationTxHash = "";
  try {
    if (state.contract) {
      els.citationMessage.textContent = "Waiting for MetaMask transaction...";
      const tx = await state.contract.declareCitation(source, target);
      const receipt = await tx.wait();
      citationTxHash = receipt.hash || receipt.transactionHash || tx.hash;
    } else if (state.account) {
      els.citationMessage.textContent = "Waiting for MetaMask evidence transaction...";
      citationTxHash = await sendEvidenceTransaction("citation", {
        sourcePaperId: source,
        citedPaperId: target
      });
    }
  } catch (error) {
    els.citationMessage.textContent = error.message || "Citation transaction was cancelled or failed.";
    console.error(error);
    return;
  }

  state.citations.push({
    source,
    target,
    declarer: state.account || "demo-wallet",
    txHash: citationTxHash || "",
    timestamp: nowStamp()
  });
  saveLocal();
  renderAll();
  els.citationMessage.textContent = `Citation declared: Paper #${source} cites Paper #${target}`;
}

function deleteSelectedPaper() {
  const paperId = Number(els.paperSelect.value);
  if (!paperId) return;

  const paper = state.papers.find((item) => item.id === paperId);
  const message = state.contract
    ? "This only removes the paper from local demo storage. Blockchain records cannot be deleted once submitted."
    : "Delete this paper from local demo storage?";

  if (!window.confirm(`${message}\n\nPaper: #${paperId} ${paper?.title || ""}`)) {
    return;
  }

  state.papers = state.papers.filter((item) => item.id !== paperId);
  delete state.reviews[paperId];
  state.citations = state.citations.filter((item) => item.source !== paperId && item.target !== paperId);

  saveLocal();
  renderAll();
}

function renderSelects() {
  const options = state.papers
    .map((paper) => `<option value="${paper.id}">#${paper.id} ${escapeHtml(paper.title)}</option>`)
    .join("");
  els.paperSelect.innerHTML = options || `<option value="">No papers yet</option>`;
  els.citationSource.innerHTML = options || `<option value="">No papers yet</option>`;
  els.citationTarget.innerHTML = options || `<option value="">No papers yet</option>`;
}

function renderPaperDetail() {
  const paper = state.papers.find((item) => item.id === Number(els.paperSelect.value)) || state.papers[0];
  if (!paper) {
    els.paperDetail.innerHTML = "No paper has been submitted yet. Go to Paper Submission first.";
    els.reviewList.innerHTML = "";
    return;
  }

  els.paperSelect.value = paper.id;
  const fileLine = paper.sourceType === "file"
    ? `<p>File: ${escapeHtml(paper.fileName)} (${Math.round((paper.fileSize || 0) / 1024)} KB)</p>`
    : `<p>Source: typed abstract/demo text</p>`;

  els.paperDetail.innerHTML = `
    <strong>#${paper.id} ${escapeHtml(paper.title)}</strong>
    <p>Author: ${escapeHtml(paper.author)}</p>
    <p>Owner wallet: ${escapeHtml(short(paper.owner))}</p>
    <p>Submitted: ${formatTime(paper.timestamp)}</p>
    <p>AI originality score: ${paper.aiScore}/100</p>
    ${fileLine}
    <p class="hash">${escapeHtml(paper.contentHash)}</p>
    ${txLink(paper.txHash)}
  `;

  const reviews = state.reviews[paper.id] || [];
  els.reviewList.innerHTML = reviews.length
    ? reviews.map((review) => `
      <article class="record">
        <strong>${escapeHtml(review.reviewer)} - Score ${review.score}</strong>
        <span class="hash">${escapeHtml(review.reviewHash)}</span>
        ${txLink(review.txHash)}
        <span class="record-meta">${formatTime(review.timestamp)}</span>
      </article>
    `).join("")
    : `<article class="record">No review hash has been submitted for this paper.</article>`;
}

function renderCitations() {
  els.citationList.innerHTML = state.citations.length
    ? state.citations.map((citation) => {
      const source = state.papers.find((paper) => paper.id === citation.source);
      const target = state.papers.find((paper) => paper.id === citation.target);
      return `
        <article class="record">
          <strong>#${citation.source} ${escapeHtml(source?.title || "")} cites #${citation.target} ${escapeHtml(target?.title || "")}</strong>
          ${txLink(citation.txHash)}
          <span class="record-meta">Declared by ${escapeHtml(short(citation.declarer))} at ${formatTime(citation.timestamp)}</span>
        </article>
      `;
    }).join("")
    : `<article class="record">No citation declaration yet.</article>`;

  renderGraph();
}

function renderGraph() {
  const width = 900;
  const height = 430;
  const radius = 150;
  const centerX = width / 2;
  const centerY = height / 2;
  const papers = state.papers;
  const positions = new Map();

  papers.forEach((paper, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(papers.length, 1) - Math.PI / 2;
    positions.set(paper.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  });

  const edges = state.citations.map((citation) => {
    const from = positions.get(citation.source);
    const to = positions.get(citation.target);
    if (!from || !to) return "";
    return `<line class="edge" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
  }).join("");

  const nodes = papers.map((paper) => {
    const pos = positions.get(paper.id);
    return `
      <g class="node" transform="translate(${pos.x} ${pos.y})">
        <circle r="34"></circle>
        <text y="5">#${paper.id}</text>
        <text y="58">${escapeHtml(paper.title).slice(0, 22)}</text>
      </g>
    `;
  }).join("");

  els.citationGraph.innerHTML = `
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#c18a2d"></path>
      </marker>
    </defs>
    ${edges}
    ${nodes || `<text x="450" y="215" text-anchor="middle" fill="#62706a">Submit papers to build a citation graph</text>`}
  `;
}

function seedDemo(options = {}) {
  const navigate = options.navigate !== false;
  state.papers = [
    {
      id: 1,
      title: "Blockchain-based Academic Integrity System",
      author: "Group 6",
      contentHash: "0x6e9f3f93c9c82c7f7d8d31a8a7f4b9d4280d5c135b43c95c2c8ff3c0c5b84a11",
      sourceType: "file",
      fileName: "academic-integrity-system.docx",
      fileSize: 482120,
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      aiScore: 91,
      owner: state.account || "0x8a91b620a6a42e0f51d152bf7d9018bbf27d3174",
      timestamp: "2026-05-02T08:20:00.000Z"
    },
    {
      id: 2,
      title: "Transparent Peer Review Ledger",
      author: "Research Lab A",
      contentHash: "0xa13f56e6c2d09dc66364657f4f0ac8f3518db5393290c84999b9808f7ce3a2a2",
      sourceType: "text",
      fileName: "",
      fileSize: 0,
      fileType: "text/plain",
      aiScore: 84,
      owner: "0x3f89e8b3d589a6228c68fd781ac13af24eb63e16",
      timestamp: "2026-05-01T13:45:00.000Z"
    },
    {
      id: 3,
      title: "Citation Provenance for Student Projects",
      author: "Research Lab B",
      contentHash: "0x9d5924ceafefb633fbf2abfb9f68df6db90412b31d35f165545ab3c290bd377a",
      sourceType: "text",
      fileName: "",
      fileSize: 0,
      fileType: "text/plain",
      aiScore: 78,
      owner: "0xb4f64c47690fd2ba14ac6c75d612f8ee97f1c45a",
      timestamp: "2026-04-29T10:15:00.000Z"
    }
  ];
  state.reviews = {
    1: [
      {
        reviewer: "Reviewer A",
        score: 88,
        reviewHash: "0xd45e6a45b49f7307c8a5e6dc125bc62e31517cf341c99a7fc7f43c7cf4be0174",
        timestamp: "2026-05-02T09:10:00.000Z"
      }
    ],
    2: [],
    3: []
  };
  state.citations = [
    {
      source: 1,
      target: 2,
      declarer: "0x8a91b620a6a42e0f51d152bf7d9018bbf27d3174",
      timestamp: "2026-05-02T09:20:00.000Z"
    },
    {
      source: 3,
      target: 1,
      declarer: "0xb4f64c47690fd2ba14ac6c75d612f8ee97f1c45a",
      timestamp: "2026-05-02T09:35:00.000Z"
    }
  ];
  saveLocal();
  renderAll();
  els.submitMessage.textContent = "Demo data loaded";
  if (navigate) {
    switchView("detail");
  }
}

window.seedDemo = seedDemo;

function renderAll() {
  renderSelects();
  renderPaperDetail();
  renderCitations();
}

function on(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

document.querySelectorAll(".nav-tab").forEach((tab) => {
  on(tab, "click", () => switchView(tab.dataset.view));
});
document.querySelectorAll("[data-jump]").forEach((button) => {
  on(button, "click", () => switchView(button.dataset.jump));
});
on(els.connectWallet, "click", connectWallet);
on(els.seedDemo, "click", seedDemo);
on(els.paperForm, "submit", submitPaper);
on(els.reviewForm, "submit", submitReview);
on(els.citationForm, "submit", submitCitation);
on(els.paperSelect, "change", renderPaperDetail);
on(els.deletePaper, "click", deleteSelectedPaper);

loadLocal();
if (!state.papers.length) seedDemo({ navigate: false });
updateWalletUi();
updateEnvironmentHint();
renderAll();
