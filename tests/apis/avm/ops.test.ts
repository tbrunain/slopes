import { UTXOSet, UTXO } from 'src/apis/avm/utxos';
import { BaseTx, CreateAssetTx, OperationTx, UnsignedTx, Tx } from 'src/apis/avm/tx';
import { AVMKeyChain } from 'src/apis/avm/keychain';
import { SecpInput, TransferableInput } from 'src/apis/avm/inputs';
import createHash from 'create-hash';
import BinTools from 'src/utils/bintools';
import BN from 'bn.js';
import {Buffer} from "buffer/";
import { SecpOutput, NFTTransferOutput, TransferableOutput} from 'src/apis/avm/outputs';
import { SigIdx, UTXOID, UnixNow, AVMConstants, InitialStates } from 'src/apis/avm/types';
import { SelectOperationClass, Operation, TransferableOperation, NFTTransferOperation } from 'src/apis/avm/ops';


/**
 * @ignore
 */
const bintools = BinTools.getInstance();

describe('Operations', () => {
    let assetID:string = "8a5d2d32e68bc50036e4d086044617fe4a0a0296b274999ba568ea92da46d533";
    let assetIDBuff:Buffer = Buffer.from(assetID, "hex");
    let addrs:Array<Buffer> = [
        bintools.avaDeserialize("B6D4v1VtPYLbiUvYXtW4Px8oE9imC2vGW"),
        bintools.avaDeserialize("P5wdRuZeaDt28eHMP5S3w9ZdoBfo7wuzF"),
        bintools.avaDeserialize("6Y3kysjF9jnHnYkdS9yGAuoHyae2eNmeV")
    ].sort();

    let locktime:BN = new BN(54321);
    let addrpay = [addrs[0], addrs[1]];

    let payload:Buffer = Buffer.alloc(1024);
    payload.write("All you Trekkies and TV addicts, Don't mean to diss don't mean to bring static.", 0, 1024, "utf8" );


    test('SelectOperationClass', () => {
        let nout:NFTTransferOutput = new NFTTransferOutput(1000, payload, locktime, 1, addrs);
        let goodop:NFTTransferOperation = new NFTTransferOperation(nout);
        let operation:Operation = SelectOperationClass(goodop.getOperationID());
        expect(operation).toBeInstanceOf(NFTTransferOperation);
        expect(() => {
            SelectOperationClass(99);
        }).toThrow("Error - SelectOperationClass: unknown opid");
    });

    test('comparator', () => {
        let op1:NFTTransferOperation = new NFTTransferOperation(new NFTTransferOutput(1000, payload, locktime, 1, addrs));
        let op2:NFTTransferOperation = new NFTTransferOperation(new NFTTransferOutput(1001, payload, locktime, 1, addrs));
        let op3:NFTTransferOperation = new NFTTransferOperation(new NFTTransferOutput(999, payload, locktime, 1, addrs));
        let cmp = NFTTransferOperation.comparator();
        expect(cmp(op1, op1)).toBe(0);
        expect(cmp(op2, op2)).toBe(0);
        expect(cmp(op3, op3)).toBe(0);
        expect(cmp(op1, op2)).toBe(-1);
        expect(cmp(op1, op3)).toBe(1);
    });

    test('NFTTransferOperation', () => {
        let nout:NFTTransferOutput = new NFTTransferOutput(1000, payload, locktime, 1, addrs);
        let op:NFTTransferOperation = new NFTTransferOperation(nout);
        
        expect(op.getOperationID()).toBe(AVMConstants.NFTXFEROP);
        expect(op.getOutput().toString()).toBe(nout.toString());
        
        let opcopy:NFTTransferOperation = new NFTTransferOperation();
        opcopy.fromBuffer(op.toBuffer());
        expect(opcopy.toString()).toBe(op.toString());
        
        op.addSignatureIdx(0, addrs[0]);
        let sigidx:Array<SigIdx> = op.getSigIdxs();
        expect(sigidx[0].getSource().toString("hex")).toBe(addrs[0].toString("hex"));
        opcopy.fromBuffer(op.toBuffer());
        expect(opcopy.toString()).toBe(op.toString());
    });

    test('TransferableOperation', () => {
        let nout:NFTTransferOutput = new NFTTransferOutput(1000, payload, locktime, 1, addrs);
        let op:NFTTransferOperation = new NFTTransferOperation(nout);
        let nfttxid:Buffer = Buffer.from(createHash("sha256").update(bintools.fromBNToBuffer(new BN(1000), 32)).digest());
        let nftoutputidx:Buffer = Buffer.from(bintools.fromBNToBuffer(new BN(1000), 4));
        let nftutxo:UTXO = new UTXO(nfttxid, nftoutputidx, assetIDBuff, nout);
        let xferop:TransferableOperation = new TransferableOperation(assetIDBuff, [nftutxo.getUTXOID()], op);

        let xferop2:TransferableOperation = new TransferableOperation(assetIDBuff, [Buffer.concat([nfttxid, nftoutputidx])], op); 
        let uid:UTXOID = new UTXOID();
        uid.fromString(nftutxo.getUTXOID());
        let xferop3:TransferableOperation = new TransferableOperation(assetIDBuff, [uid], op);

        expect(xferop.getAssetID().toString("hex")).toBe(assetID);
        let utxoiddeserialized:Buffer = bintools.avaDeserialize(xferop.getUTXOIDs()[0].toString());
        expect(bintools.bufferToB58(utxoiddeserialized)).toBe(nftutxo.getUTXOID());
        expect(xferop.getOperation().toString()).toBe(op.toString());

        let opcopy:TransferableOperation = new TransferableOperation();
        opcopy.fromBuffer(xferop.toBuffer());
        expect(opcopy.toString()).toBe(xferop.toString());

        expect(xferop2.toBuffer().toString("hex")).toBe(xferop.toBuffer().toString('hex'));
        expect(xferop3.toBuffer().toString("hex")).toBe(xferop.toBuffer().toString('hex'));
    });

});