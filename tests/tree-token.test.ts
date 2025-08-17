 
import { describe, it, expect, beforeEach } from "vitest";

interface Role {
	canMint: boolean;
	canGovern: boolean;
}

interface AllowanceKey {
	owner: string;
	spender: string;
}

interface MockContract {
	admin: string;
	minter: string;
	governance: string;
	paused: boolean;
	totalSupply: bigint;
	currentMintCap: bigint;
	lastMintBlock: bigint;
	balances: Map<string, bigint>;
	staked: Map<string, bigint>;
	allowances: Map<string, bigint>;
	roles: Map<string, Role>;
	MAX_SUPPLY: bigint;
	MINTING_DECAY_RATE: bigint;
	MINTING_PERIOD: bigint;
	isAdmin(caller: string): boolean;
	isMinter(caller: string): boolean;
	isGovernance(caller: string): boolean;
	setPaused(
		caller: string,
		pause: boolean
	): { value: boolean } | { error: number };
	transferAdmin(
		caller: string,
		newAdmin: string
	): { value: boolean } | { error: number };
	setMinter(
		caller: string,
		target: string,
		canMint: boolean
	): { value: boolean } | { error: number };
	setGovernance(
		caller: string,
		newGovernance: string
	): { value: boolean } | { error: number };
	updateMintCap(currentBlock: bigint): { value: bigint };
	mint(
		caller: string,
		recipient: string,
		amount: bigint
	): { value: boolean } | { error: number };
	burn(caller: string, amount: bigint): { value: boolean } | { error: number };
	transfer(
		caller: string,
		recipient: string,
		amount: bigint
	): { value: boolean } | { error: number };
	batchTransfer(
		caller: string,
		recipients: Array<{ to: string; amount: bigint }>
	): { value: boolean } | { error: number };
	approve(
		caller: string,
		spender: string,
		amount: bigint
	): { value: boolean } | { error: number };
	transferFrom(
		caller: string,
		owner: string,
		recipient: string,
		amount: bigint
	): { value: boolean } | { error: number };
	stake(caller: string, amount: bigint): { value: boolean } | { error: number };
	unstake(
		caller: string,
		amount: bigint
	): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
	admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	minter: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	governance: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	paused: false,
	totalSupply: 0n,
	currentMintCap: 100_000_000_000_000_00n,
	lastMintBlock: 0n,
	balances: new Map(),
	staked: new Map(),
	allowances: new Map(),
	roles: new Map(),
	MAX_SUPPLY: 100_000_000_000_000_00n,
	MINTING_DECAY_RATE: 5_000_000n,
	MINTING_PERIOD: 1440n,
	isAdmin(caller: string) {
		return caller === this.admin;
	},
	isMinter(caller: string) {
		return this.isAdmin(caller) || (this.roles.get(caller)?.canMint ?? false);
	},
	isGovernance(caller: string) {
		return this.isAdmin(caller) || caller === this.governance;
	},
	setPaused(caller: string, pause: boolean) {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.paused = pause;
		return { value: pause };
	},
	transferAdmin(caller: string, newAdmin: string) {
		if (!this.isAdmin(caller)) return { error: 100 };
		if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 105 };
		this.admin = newAdmin;
		return { value: true };
	},
	setMinter(caller: string, target: string, canMint: boolean) {
		if (!this.isAdmin(caller)) return { error: 100 };
		if (target === "SP000000000000000000002Q6VF78") return { error: 105 };
		this.roles.set(target, {
			canMint,
			canGovern: this.roles.get(target)?.canGovern ?? false,
		});
		return { value: true };
	},
	setGovernance(caller: string, newGovernance: string) {
		if (!this.isAdmin(caller)) return { error: 100 };
		if (newGovernance === "SP000000000000000000002Q6VF78")
			return { error: 105 };
		this.governance = newGovernance;
		return { value: true };
	},
	updateMintCap(currentBlock: bigint) {
		const blocksElapsed = currentBlock - this.lastMintBlock;
		if (blocksElapsed >= this.MINTING_PERIOD) {
			const decayFactor = (this.MINTING_DECAY_RATE * blocksElapsed) / 10000n;
			this.currentMintCap =
				(this.currentMintCap * (10000n - decayFactor)) / 10000n;
			this.lastMintBlock = currentBlock;
		}
		return { value: this.currentMintCap };
	},
	mint(caller: string, recipient: string, amount: bigint) {
		if (!this.isMinter(caller)) return { error: 100 };
		if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
		if (amount <= 0n) return { error: 106 };
		this.updateMintCap(1000n);
		const newSupply = this.totalSupply + amount;
		if (newSupply > this.currentMintCap) return { error: 107 };
		if (newSupply > this.MAX_SUPPLY) return { error: 103 };
		this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
		this.totalSupply = newSupply;
		return { value: true };
	},
	burn(caller: string, amount: bigint) {
		if (this.paused) return { error: 104 };
		if (amount <= 0n) return { error: 106 };
		const balance = this.balances.get(caller) || 0n;
		if (balance < amount) return { error: 101 };
		this.balances.set(caller, balance - amount);
		this.totalSupply -= amount;
		return { value: true };
	},
	transfer(caller: string, recipient: string, amount: bigint) {
		if (this.paused) return { error: 104 };
		if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
		if (amount <= 0n) return { error: 106 };
		const balance = this.balances.get(caller) || 0n;
		if (balance < amount) return { error: 101 };
		this.balances.set(caller, balance - amount);
		this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
		return { value: true };
	},
	batchTransfer(
		caller: string,
		recipients: Array<{ to: string; amount: bigint }>
	) {
		if (this.paused) return { error: 104 };
		for (const { to, amount } of recipients) {
			if (to === "SP000000000000000000002Q6VF78") return { error: 105 };
			if (amount <= 0n) return { error: 106 };
			const balance = this.balances.get(caller) || 0n;
			if (balance < amount) return { error: 101 };
			this.balances.set(caller, balance - amount);
			this.balances.set(to, (this.balances.get(to) || 0n) + amount);
		}
		return { value: true };
	},
	approve(caller: string, spender: string, amount: bigint) {
		if (this.paused) return { error: 104 };
		if (spender === "SP000000000000000000002Q6VF78") return { error: 105 };
		if (amount <= 0n) return { error: 106 };
		this.allowances.set(`${caller}:${spender}`, amount);
		return { value: true };
	},
	transferFrom(
		caller: string,
		owner: string,
		recipient: string,
		amount: bigint
	) {
		if (this.paused) return { error: 104 };
		if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
		if (amount <= 0n) return { error: 106 };
		const allowance = this.allowances.get(`${owner}:${caller}`) || 0n;
		const ownerBalance = this.balances.get(owner) || 0n;
		if (allowance < amount) return { error: 100 };
		if (ownerBalance < amount) return { error: 101 };
		this.allowances.set(`${owner}:${caller}`, allowance - amount);
		this.balances.set(owner, ownerBalance - amount);
		this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
		return { value: true };
	},
	stake(caller: string, amount: bigint) {
		if (this.paused) return { error: 104 };
		if (amount <= 0n) return { error: 106 };
		const balance = this.balances.get(caller) || 0n;
		if (balance < amount) return { error: 101 };
		this.balances.set(caller, balance - amount);
		this.staked.set(caller, (this.staked.get(caller) || 0n) + amount);
		return { value: true };
	},
	unstake(caller: string, amount: bigint) {
		if (this.paused) return { error: 104 };
		if (amount <= 0n) return { error: 106 };
		const stakeBalance = this.staked.get(caller) || 0n;
		if (stakeBalance < amount) return { error: 102 };
		this.staked.set(caller, stakeBalance - amount);
		this.balances.set(caller, (this.balances.get(caller) || 0n) + amount);
		return { value: true };
	},
};

describe("ArborChain TreeToken", () => {
	beforeEach(() => {
		mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.minter = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.governance = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.paused = false;
		mockContract.totalSupply = 0n;
		mockContract.currentMintCap = 100_000_000_000_000_00n;
		mockContract.lastMintBlock = 0n;
		mockContract.balances = new Map();
		mockContract.staked = new Map();
		mockContract.allowances = new Map();
		mockContract.roles = new Map();
	});

	it("should mint tokens when called by admin", () => {
		const result = mockContract.mint(mockContract.admin, "ST2CY5...", 1000n);
		expect(result).toEqual({ value: true });
		expect(mockContract.balances.get("ST2CY5...")).toBe(1000n);
		expect(mockContract.totalSupply).toBe(1000n);
	});

	it("should mint tokens when called by minter", () => {
		mockContract.setMinter(mockContract.admin, "ST3NB...", true);
		const result = mockContract.mint("ST3NB...", "ST2CY5...", 1000n);
		expect(result).toEqual({ value: true });
		expect(mockContract.balances.get("ST2CY5...")).toBe(1000n);
	});

	it("should transfer tokens", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
		const result = mockContract.transfer("ST2CY5...", "ST3NB...", 200n);
		expect(result).toEqual({ value: true });
		expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
		expect(mockContract.balances.get("ST3NB...")).toBe(200n);
	});

	it("should batch transfer tokens", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 1000n);
		const recipients = [
			{ to: "ST3NB...", amount: 200n },
			{ to: "ST4RE...", amount: 300n },
		];
		const result = mockContract.batchTransfer("ST2CY5...", recipients);
		expect(result).toEqual({ value: true });
		expect(mockContract.balances.get("ST2CY5...")).toBe(500n);
		expect(mockContract.balances.get("ST3NB...")).toBe(200n);
		expect(mockContract.balances.get("ST4RE...")).toBe(300n);
	});

	it("should approve and transfer from allowance", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
		mockContract.approve("ST2CY5...", "ST3NB...", 200n);
		const result = mockContract.transferFrom(
			"ST3NB...",
			"ST2CY5...",
			"ST4RE...",
			100n
		);
		expect(result).toEqual({ value: true });
		expect(mockContract.balances.get("ST2CY5...")).toBe(400n);
		expect(mockContract.balances.get("ST4RE...")).toBe(100n);
		expect(mockContract.allowances.get("ST2CY5...:ST3NB...")).toBe(100n);
	});

	it("should stake tokens", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
		const result = mockContract.stake("ST2CY5...", 200n);
		expect(result).toEqual({ value: true });
		expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
		expect(mockContract.staked.get("ST2CY5...")).toBe(200n);
	});

	it("should unstake tokens", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
		mockContract.stake("ST2CY5...", 200n);
		const result = mockContract.unstake("ST2CY5...", 100n);
		expect(result).toEqual({ value: true });
		expect(mockContract.staked.get("ST2CY5...")).toBe(100n);
		expect(mockContract.balances.get("ST2CY5...")).toBe(400n);
	});

	it("should not allow transfers when paused", () => {
		mockContract.setPaused(mockContract.admin, true);
		const result = mockContract.transfer("ST2CY5...", "ST3NB...", 10n);
		expect(result).toEqual({ error: 104 });
	});

	it("should prevent non-admin from setting minter", () => {
		const result = mockContract.setMinter("ST2CY5...", "ST3NB...", true);
		expect(result).toEqual({ error: 100 });
	});

	it("should prevent transfers to zero address", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
		const result = mockContract.transfer(
			"ST2CY5...",
			"SP000000000000000000002Q6VF78",
			200n
		);
		expect(result).toEqual({ error: 105 });
	});

	it("should prevent invalid amount in transfer", () => {
		mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
		const result = mockContract.transfer("ST2CY5...", "ST3NB...", 0n);
		expect(result).toEqual({ error: 106 });
	});
});