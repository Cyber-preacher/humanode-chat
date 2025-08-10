const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AddressRouter", function () {
  it("sets and gets named addresses", async function () {
    const [owner] = await ethers.getSigners();

    const Router = await ethers.getContractFactory("AddressRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    const profileAddr = owner.address;
    const chatAddr = "0x000000000000000000000000000000000000dEaD";

    await (await router.set("ProfileRegistry", profileAddr)).wait();
    await (await router.set("ChatRegistry", chatAddr)).wait();

    expect(await router.get("ProfileRegistry")).to.equal(profileAddr);
    expect(await router.get("ChatRegistry")).to.equal(chatAddr);
  });

  it("only owner can set", async function () {
    const [, attacker] = await ethers.getSigners();

    const Router = await ethers.getContractFactory("AddressRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    await expect(
      router.connect(attacker).set("X", attacker.address)
    ).to.be.reverted;
  });
});
