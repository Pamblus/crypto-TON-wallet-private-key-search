import TonWeb from "tonweb";
import nacl from "tweetnacl";
import axios from "axios";
import fs from "fs";
import crypto from "crypto";

const SEED_FILE = "seed.txt";
const TRUE_SEED_WALLET_FILE = "trueseedwallet.txt";
const SAVE_WALLET_FILE = "save-wallet.json";
const CONFIG_FILE = "config.json";

interface Config {
  randomBytes: boolean;
  sameSymbols: boolean;
  wordToBytes: boolean;
  word: string;
  parallelProcesses: number;
  apiKeys: string[];
  threadsPerKey: number;
  saveHashes: boolean;
  display: {
    hash: boolean;
    balance: boolean;
    address: boolean;
    publicKey: boolean;
    fullData: boolean;
  };
  saveData: {
    saveData: boolean;
    saveHash: boolean;
    saveBalance: boolean;
    saveAddress: boolean;
    savePublicKey: boolean;
  };
  saveDataAddress: {
    saveDataAddress: boolean;
    startsearchend: number;
    words: string[];
  };
  showGenerationCount: boolean;
}

let generationCount = 0;

async function getWalletBalance(
  walletAddress: string,
  apiKey: string,
  retries: number = 0,
): Promise<number> {
  const apiUrl = `https://toncenter.com/api/v3/wallet?address=${walletAddress}&api_key=${apiKey}`;
  try {
    const response = await axios.get(apiUrl);
    return response.data.balance;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.error(`Invalid API key: ${apiKey}. Writing to FalseApiKey.json.`);
      fs.appendFileSync('FalseApiKey.json', `{"apiKey": "${apiKey}"}\n`);
      return 0;
    } else {
      console.error("Error fetching balance:", error);
      if (retries < 3) {
        console.log(`Retrying (${retries + 1}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return getWalletBalance(walletAddress, apiKey, retries + 1);
      } else {
        console.error("Max retries reached. Stopping.");
        process.exit(1);
      }
    }
  }
}

function incrementPrivateKey(
  privateKey: Uint8Array,
  increment: number,
): Uint8Array {
  const newPrivateKey = new Uint8Array(privateKey);
  for (let i = newPrivateKey.length - 1; i >= 0; i--) {
    const newVal = newPrivateKey[i] + increment;
    newPrivateKey[i] = newVal % 256;
    if (newVal < 256) {
      break;
    }
    increment = Math.floor(newVal / 256);
  }
  return newPrivateKey;
}

function saveSeed(privateKey: Uint8Array): void {
  fs.writeFileSync(SEED_FILE, Buffer.from(privateKey).toString("hex"));
}

function loadSeed(config: Config): Uint8Array {
  if (fs.existsSync(SEED_FILE)) {
    const seedHex = fs.readFileSync(SEED_FILE, "utf8");
    return new Uint8Array(Buffer.from(seedHex, "hex"));
  } else {
    let initialSeed: Uint8Array;
    if (config.randomBytes) {
      initialSeed = nacl.randomBytes(32);
    } else if (config.sameSymbols) {
      initialSeed = new Uint8Array(32).fill(0x41); // 'A' in hex
    } else if (config.wordToBytes) {
      initialSeed = new Uint8Array(Buffer.from(config.word, "utf8")).slice(
        0,
        32,
      );
    } else {
      initialSeed = new Uint8Array(32).fill(0);
    }
    saveSeed(initialSeed);
    return initialSeed;
  }
}

function generateRandomPrivateKey(): Uint8Array {
  return nacl.randomBytes(32);
}

function saveTrueSeedWallet(
  privateKeyHex: string,
  publicKeyHex: string,
  walletAddress: string,
  balance: number,
): void {
  const data = {
    privateKeyHex,
    publicKeyHex,
    walletAddress,
    balance,
  };
  fs.appendFileSync(
    TRUE_SEED_WALLET_FILE,
    JSON.stringify(data, null, 2) + "\n",
  );
}

function saveGeneratedData(
  privateKeyHex: string,
  balance: number,
  walletAddress: string,
  publicKeyHex: string,
  config: Config,
): void {
  if (config.saveData.saveData) {
    const data: any = {};
    if (config.saveData.saveHash) data.privateKeyHex = privateKeyHex;
    if (config.saveData.saveBalance) data.balance = balance;
    if (config.saveData.saveAddress) data.walletAddress = walletAddress;
    if (config.saveData.savePublicKey) data.publicKeyHex = publicKeyHex;

    fs.appendFileSync(
      SAVE_WALLET_FILE,
      JSON.stringify(data, null, 2) + "\n",
    );
  }
}

function loadConfig(): Config {
  if (fs.existsSync(CONFIG_FILE)) {
    const configData = fs.readFileSync(CONFIG_FILE, "utf8");
    const config = JSON.parse(configData);
    return {
      randomBytes: config.randomBytes || false,
      sameSymbols: config.sameSymbols || false,
      wordToBytes: config.wordToBytes || false,
      word: config.word || "",
      parallelProcesses: config.parallelProcesses || 10,
      apiKeys: config.apiKeys || [],
      threadsPerKey: config.threadsPerKey || 1,
      saveHashes: config.saveHashes || false,
      display: {
        hash: config.display?.hash || false,
        balance: config.display?.balance || false,
        address: config.display?.address || false,
        publicKey: config.display?.publicKey || false,
        fullData: config.display?.fullData || false,
      },
      saveData: {
        saveData: config.saveData?.saveData || false,
        saveHash: config.saveData?.saveHash || false,
        saveBalance: config.saveData?.saveBalance || false,
        saveAddress: config.saveData?.saveAddress || false,
        savePublicKey: config.saveData?.savePublicKey || false,
      },
      saveDataAddress: {
        saveDataAddress: config.saveDataAddress?.saveDataAddress || false,
        startsearchend: config.saveDataAddress?.startsearchend || 0,
        words: config.saveDataAddress?.words || [],
      },
      showGenerationCount: config.showGenerationCount || false,
    };
  } else {
    return {
      randomBytes: false,
      sameSymbols: false,
      wordToBytes: false,
      word: "",
      parallelProcesses: 10,
      apiKeys: [],
      threadsPerKey: 1,
      saveHashes: false,
      display: {
        hash: false,
        balance: false,
        address: false,
        publicKey: false,
        fullData: false,
      },
      saveData: {
        saveData: false,
        saveHash: false,
        saveBalance: false,
        saveAddress: false,
        savePublicKey: false,
      },
      saveDataAddress: {
        saveDataAddress: false,
        startsearchend: 0,
        words: [],
      },
      showGenerationCount: false,
    };
  }
}

function formatOutput(
  index: number,
  apiKeyIndex: number,
  privateKeyHex: string,
  balance: number,
  walletAddress: string,
  publicKeyHex: string,
  config: Config,
): string {
  const reset = "\x1b[0m";
  const blue = "\x1b[34m";
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const cyan = "\x1b[36m";
  const magenta = "\x1b[35m";

  const formatKey = (key: string) => {
    if (config.display.fullData || key.length <= 12) {
      return key;
    }
    return `${key.slice(0, 6)}.....${key.slice(-6)}`;
  };

  const parts = [];
  parts.push(`${blue}Thread${(index + 1).toString().padStart(4, '0')}${reset}`);
  parts.push(`${green}Key${(apiKeyIndex + 1).toString().padStart(4, '0')}${reset}`);
  if (config.display.hash) parts.push(`${yellow}${formatKey(privateKeyHex)}${reset}`);
  if (config.display.balance) parts.push(`${cyan}${balance}${reset}`);
  if (config.display.address) parts.push(`${magenta}${formatKey(walletAddress)}${reset}`);
  if (config.display.publicKey) parts.push(formatKey(publicKeyHex)); // Без цвета

  return parts.join(" | ");
}

async function processBatch(
  privateKeys: Uint8Array[],
  tonwebInstance: TonWeb,
  apiKeys: string[],
  threadsPerKey: number,
  config: Config,
) {
  const promises = privateKeys.map(async (privateKey, index) => {
    const apiKeyIndex = Math.floor(index / threadsPerKey) % apiKeys.length;
    const apiKey = apiKeys[apiKeyIndex];
    const privateKeyHex = Buffer.from(privateKey).toString("hex");

    const keyPair = nacl.sign.keyPair.fromSeed(privateKey);
    const publicKey = keyPair.publicKey;
    const publicKeyHex = Buffer.from(publicKey).toString("hex");
    const wallet = tonwebInstance.wallet.create({ publicKey: publicKey });
    const walletAddress = (await wallet.getAddress()).toString(true, true, true);
    const balance = await getWalletBalance(walletAddress, apiKey);

    if (config.saveHashes && balance > 0) {
      saveTrueSeedWallet(privateKeyHex, publicKeyHex, walletAddress, balance);
    }

    saveGeneratedData(privateKeyHex, balance, walletAddress, publicKeyHex, config);

    if (config.saveDataAddress.saveDataAddress) {
      const addressWithoutPrefix = walletAddress.slice(2).toLowerCase(); // Convert address to lower case
      const words = config.saveDataAddress.words.map(word => word.toLowerCase()); // Convert words to lower case
      console.log(`Checking address: ${walletAddress}`); // Log for debugging
      for (const word of words) {
        const wordIndex = addressWithoutPrefix.indexOf(word);
        if (wordIndex !== -1) {
          let position = 1; // Not important where
          if (wordIndex === 0) {
            position = 0; // At the beginning
          } else if (wordIndex + word.length === addressWithoutPrefix.length) {
            position = 2; // At the end
          }
          const data = `${walletAddress} | ${word} | ${position}`;
          console.log(`Saving address: ${data}`); // Log for debugging

          // Check if the file exists and create it if it doesn't
          if (!fs.existsSync('saveDataAddress.json')) {
            fs.writeFileSync('saveDataAddress.json', '');
          }

          fs.appendFileSync('saveDataAddress.json', data + '\n');
        }
      }
    }

    const output = formatOutput(
      index,
      apiKeyIndex,
      privateKeyHex,
      balance,
      walletAddress,
      publicKeyHex,
      config,
    );

    console.log(output);

    return { privateKey, balance };
  });

  return await Promise.all(promises);
}

(async () => {
  const tonwebInstance = new TonWeb();
  const config = loadConfig();

  let privateKey = config.randomBytes
    ? generateRandomPrivateKey()
    : loadSeed(config);

  while (true) {
    const privateKeys = [];
    for (let i = 0; i < config.parallelProcesses; i++) {
      privateKeys.push(privateKey);
      privateKey = config.randomBytes
        ? generateRandomPrivateKey()
        : incrementPrivateKey(privateKey, config.parallelProcesses);
    }

    const results = await processBatch(
      privateKeys,
      tonwebInstance,
      config.apiKeys,
      config.threadsPerKey,
      config,
    );

    generationCount += privateKeys.length;
    if (config.showGenerationCount) {
      console.log(`Total generations: ${generationCount}`);
    }

    for (const result of results) {
      if (result.balance > 0) {
        console.log("Found wallet with positive balance:", result.privateKey);
      }
    }

    saveSeed(privateKey);
  }
})();