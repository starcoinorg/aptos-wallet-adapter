import { MaybeHexString, Types } from 'aptos';
import {
  WalletAccountChangeError,
  WalletDisconnectionError,
  WalletGetNetworkError,
  WalletNetworkChangeError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletSignAndSubmitMessageError,
  WalletSignMessageError,
  WalletSignTransactionError
} from '../WalletProviders/errors';
import {
  AccountKeys,
  BaseWalletAdapter,
  NetworkInfo,
  scopePollingDetectionStrategy,
  SignMessagePayload,
  SignMessageResponse,
  WalletAdapterNetwork,
  WalletName,
  WalletReadyState
} from './BaseAdapter';

interface ConnectStarMaskAccount {
  address: MaybeHexString;
  method: string;
  publicKey: MaybeHexString;
  status: number;
}

interface StarMaskAccount {
  address: MaybeHexString;
  publicKey?: MaybeHexString;
  authKey?: MaybeHexString;
  isConnected: boolean;
}
interface IStarMaskWallet {
  connect: () => Promise<ConnectStarMaskAccount>;
  account(): Promise<MaybeHexString>;
  publicKey(): Promise<MaybeHexString>;
  generateTransaction(sender: MaybeHexString, payload: any): Promise<any>;
  signAndSubmit(
    transaction: Types.TransactionPayload,
    options?: any
  ): Promise<{
    success: boolean;
    result: {
      hash: Types.HexEncodedBytes;
    };
  }>;
  isConnected(): Promise<boolean>;
  signTransaction(transaction: Types.TransactionPayload, options?: any): Promise<Uint8Array>;
  signMessage(message: SignMessagePayload): Promise<{
    success: boolean;
    result: SignMessageResponse;
  }>;
  disconnect(): Promise<void>;
  network(): Promise<NetworkInfo>;
  onAccountChange(listener: (address: string | undefined) => void): Promise<void>;
  onNetworkChange(listener: (network: NetworkInfo) => void): Promise<void>;
}

interface StarMaskWindow extends Window {
  starcoin?: any;
}

declare const window: StarMaskWindow;

export const StarMaskWalletName = 'StarMask' as WalletName<'StarMask'>;

export interface StarMaskWalletAdapterConfig {
  provider?: any;
  // network?: WalletAdapterNetwork;
  timeout?: number;
}

export class StarMaskWalletAdapter extends BaseWalletAdapter {
  name = StarMaskWalletName;

  url = 'https://chrome.google.com/webstore/detail/starmask/mfhbebgoclkghebffdldpobeajmbecfk';

  icon =
    'https://raw.githubusercontent.com/starcoinorg/starmask-extension/bf03bffd3443d11307e535ac581c881f85dfea7f/app/images/logo/starmask.svg';

  protected _provider: any | undefined;

  protected _network: WalletAdapterNetwork;

  protected _chainId: string;

  protected _api: string;

  protected _timeout: number;

  protected _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected;

  protected _connecting: boolean;

  protected _wallet: StarMaskAccount | null;

  constructor({
    // provider,
    // network = WalletAdapterNetwork.Testnet,
    timeout = 10000
  }: StarMaskWalletAdapterConfig = {}) {
    super();

    this._provider = typeof window !== 'undefined' ? window.starcoin : undefined;
    this._network = undefined;
    this._timeout = timeout;
    this._connecting = false;
    this._wallet = null;

    if (typeof window !== 'undefined' && this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (window.starcoin) {
          this._readyState = WalletReadyState.Installed;
          this.emit('readyStateChange', this._readyState);
          return true;
        }
        return false;
      });
    }
  }

  get publicAccount(): AccountKeys {
    return {
      publicKey: this._wallet?.publicKey || null,
      address: this._wallet?.address || null,
      authKey: this._wallet?.authKey || null
    };
  }

  get network(): NetworkInfo {
    return {
      name: this._network,
      api: this._api,
      chainId: this._chainId
    };
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return !!this._wallet?.isConnected;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return;
      if (
        !(
          this._readyState === WalletReadyState.Loadable ||
          this._readyState === WalletReadyState.Installed
        )
      )
        throw new WalletNotReadyError();
      this._connecting = true;

      const provider = this._provider || window.starcoin;
      const isConnected = await provider?.isConnected();
      if (isConnected) {
        await provider?.disconnect();
      }
      const response = await provider?.connect();

      if (!response) {
        throw new WalletNotConnectedError('No connect response');
      }

      const walletAccount = response.address;
      const publicKey = null;
      if (walletAccount) {
        this._wallet = {
          address: walletAccount,
          publicKey,
          isConnected: true
        };

        try {
          const networkInfo = await provider?.network();
          this._network = networkInfo.name;
          this._chainId = networkInfo.chainId;
          this._api = null;
        } catch (error: any) {
          const errMsg = error.message;
          this.emit('error', new WalletGetNetworkError(errMsg));
          throw error;
        }
      }

      this.emit('connect', this._wallet?.address || '');
    } catch (error: any) {
      this.emit('error', new Error('User has rejected the connection'));
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet;
    const provider = this._provider || window.starcoin;
    if (wallet) {
      this._wallet = null;

      try {
        await provider?.disconnect();
      } catch (error: any) {
        this.emit('error', new WalletDisconnectionError(error?.message, error));
      }
    }

    this.emit('disconnect');
  }

  async signTransaction(
    transactionPyld: Types.TransactionPayload,
    options?: any
  ): Promise<Uint8Array> {
    try {
      const wallet = this._wallet;
      const provider = this._provider || window.starcoin;
      if (!wallet || !provider) throw new WalletNotConnectedError();
      // const response = await provider?.signTransaction(transactionPyld, options);
      // return response as Uint8Array;
      throw new WalletSignTransactionError('signTransaction is not implemented')
    } catch (error: any) {
      this.emit('error', new WalletSignTransactionError(error));
      throw error;
    }
  }

  async signAndSubmitTransaction(
    transaction: Types.TransactionPayload,
    options?: any
  ): Promise<{ hash: Types.HexEncodedBytes }> {
    try {
      const wallet = this._wallet;
      const provider = this._provider || window.starcoin;
      if (!wallet || !provider) throw new WalletNotConnectedError();
      const response = await provider.signAndSubmitTransaction(transaction, options);
      if (response) {
        return { hash: response };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      this.emit('error', new WalletSignAndSubmitMessageError(error.message));
      throw error;
    }
  }

  async signMessage(messagePayload: SignMessagePayload): Promise<SignMessageResponse> {
    try {
      const wallet = this._wallet;
      const provider = this._provider || window.starcoin;
      if (!wallet || !provider) throw new WalletNotConnectedError();

      const response = await provider?.signMessage(messagePayload);
      if (response) {
        return response;
      } else {
        throw new Error('Sign Message failed');
      }
    } catch (error: any) {
      const errMsg = error.message;
      this.emit('error', new WalletSignMessageError(errMsg));
      throw error;
    }
  }

  async onAccountChange(): Promise<void> {
    try {
      const wallet = this._wallet;
      const provider = this._provider || window.starcoin;
      if (!wallet || !provider) throw new WalletNotConnectedError();
      const handleAccountChange = async (newAccount: string | undefined) => {
        // disconnect wallet if newAccount is undefined
        if (newAccount === undefined) {
          if (this.connected) {
            await provider?.disconnect();
          }
          return;
        }
        // const newPublicKey = await provider?.publicKey();
        const newPublicKey = null;
        this._wallet = {
          ...this._wallet,
          address: newAccount,
          publicKey: newPublicKey
        };
        this.emit('accountChange', newAccount);
      };
      await provider?.onAccountChange(handleAccountChange);
    } catch (error: any) {
      const errMsg = error.message;
      this.emit('error', new WalletAccountChangeError(errMsg));
      throw error;
    }
  }

  async onNetworkChange(): Promise<void> {
    try {
      const wallet = this._wallet;
      const provider = this._provider || window.starcoin;
      if (!wallet || !provider) throw new WalletNotConnectedError();
      const handleNetworkChange = (network: NetworkInfo) => {
        this._network = network.name;
        this._api = network.api;
        this._chainId = network.chainId;
        this.emit('networkChange', this._network);
      };
      await provider?.onNetworkChange(handleNetworkChange);
    } catch (error: any) {
      const errMsg = error.message;
      this.emit('error', new WalletNetworkChangeError(errMsg));
      throw error;
    }
  }
}
