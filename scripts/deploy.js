const hre = require("hardhat");

async function main() {
  const Registry = await hre.ethers.getContractFactory("AcademicIntegrityRegistry");
  const registry = await Registry.deploy();

  await registry.waitForDeployment();

  console.log("AcademicIntegrityRegistry deployed to:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
