import { expect } from "chai";
import { ethers } from "hardhat";

describe("AddressRouter", function () {
  it("stores and reads contract addresses by key", async function () {
    const [owner, stranger] = await ethers.getSigners();

    const Router = await ethers.getContractFactory("AddressRouter", owner);
    const router = await Router.deploy();
    await router.waitForDeployment();

    const key = ethers.encodeBytes32String("ProfileRegistry");
    const value = "0x000000000000000000000000000000000000dEaD";

    // owner can set
    await expect(router.set(key, value)).to.emit(router, "AddressSet").withArgs(key, value);

    // read back
    expect(await router.get(key)).to.equal(value);

    // non-owner cannot set
    await expect(router.connect(stranger).set(key, value)).to.be.revertedWithCustomError(
      router,
      "OwnableUnauthorizedAccount"
    );
  });
});
