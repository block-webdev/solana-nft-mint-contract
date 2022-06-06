import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Jmint } from "../target/types/jmint";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, Transaction, Keypair } from "@solana/web3.js";
const { PublicKey, SystemProgram } = anchor.web3;

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const getMetadata = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};
const getMasterEdition = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();



describe("jmint", () => {
  // Configure the client to use the local cluster.
  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Jmint as Program<Jmint>;
  let user = Keypair.generate();

  it("Is initialized!", async () => {
    await airdropSol(provider, user.publicKey, 10000000000); // 10 sol

    // Add your test here.
    const tx1 = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx1);


    const NftTokenAccount = await getAssociatedTokenAddress(
      mintKey.publicKey,
      user.publicKey
    );
    console.log("NFT Account: ", NftTokenAccount.toBase58());

    const lamports: number =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );
    const mint_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: user.publicKey,
        newAccountPubkey: mintKey.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
        lamports,
      }),
      createInitializeMintInstruction(
        mintKey.publicKey,
        0,
        user.publicKey,
        user.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        user.publicKey,
        NftTokenAccount,
        user.publicKey,
        mintKey.publicKey
      )
    );
    let res = await program.provider.sendAndConfirm(mint_tx, [mintKey, user]);
    console.log(
      await program.provider.connection.getParsedAccountInfo(mintKey.publicKey)
    );
    console.log("Account: ", res);
    console.log("Mint key: ", mintKey.publicKey.toString());
    console.log("User: ", user.publicKey.toString());
    const metadataAddress = await getMetadata(mintKey.publicKey);
    const masterEdition = await getMasterEdition(mintKey.publicKey);
    console.log("Metadata address: ", metadataAddress.toBase58());
    console.log("MasterEdition: ", masterEdition.toBase58());

    console.log('1111111111111111111111111');

    const tx = new Transaction().add(
      await program.methods.mintNft(
      mintKey.publicKey,
      "https://arweave.net/y5e5DJsiwH0s_ayfMwYk-SnrZtVZzHLQDSTZ5dNRUHA",
      "NFT Title"
      ).accounts({
          mintAuthority: user.publicKey,
          mint: mintKey.publicKey,
          tokenAccount: NftTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadata: metadataAddress,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          payer: user.publicKey,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          masterEdition: masterEdition,
        },
    ).instruction());
    const res1 = await program.provider.connection.simulateTransaction(tx, [user]);
    console.log('2222222222', res1);
    res = await program.provider.sendAndConfirm(tx, [user]);
    console.log("Your transaction signature", tx);


  });
});


export const airdropSol = async (
  provider: anchor.Provider,
  target: anchor.web3.PublicKey,
  lamps: number
): Promise<string> => {
  const sig: string = await provider.connection.requestAirdrop(target, lamps);
  await provider.connection.confirmTransaction(sig);
  return sig;
};
