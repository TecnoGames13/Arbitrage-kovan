require('dotenv').config()
const Web3 = require('web3');
const abis = require('./abis');
const { kovan: addresses } = require('./addresses');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);

const sushiswap = new web3.eth.Contract(
    abis.sushiswap.sushiRouter,
    addresses.sushiswap.sushi_router,
);

const uniswap = new web3.eth.Contract(
    abis.uniswap.uniRouter,
    addresses.uniswap.uni_router,
);

const arbitrage = new web3.eth.Contract(
    abis.arbitrage.arbitrageContract,
    addresses.arbitrage.arbitrage_contract,
);

const weth = addresses.tokens.weth;
const dai = addresses.tokens.dai;

const publicKey = process.env.PUBLIC_KEY;
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const AMOUNT_ETH = 1;
const AMOUNT_ETH_WEI = web3.utils.toWei(AMOUNT_ETH.toString());
const PATH_ETH_DAI = [weth, dai];
const PATH_DAI_ETH = [dai, weth];

const init = async () => {
    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block => {

        console.log(`Nuevo bloque recibido. Bloque # ${block.number}`);

        const strategy1DAI = await Promise.all([
            uniswap
                .methods
                .getAmountsOut(
                    AMOUNT_ETH_WEI,
                    PATH_ETH_DAI
                )
                .call()
            ]);

        const strategy1ETH = await Promise.all([ 
            sushiswap
                .methods
                .getAmountsOut(
                    strategy1DAI[0][1],
                    PATH_DAI_ETH
                )
                .call()
        ]);

        const strategy1Rates = {
            DAI: parseFloat(strategy1DAI[0][1] / (10**18)),
            ETH: parseFloat(strategy1ETH[0][1] / (10**18))
        };
        console.log("Estrategia 1");
        console.log(strategy1Rates);

        const strategy2DAI = await Promise.all([
            sushiswap
                .methods
                .getAmountsOut(
                    AMOUNT_ETH_WEI,
                    PATH_ETH_DAI
                )
                .call()
        ]);

        const strategy2ETH = await Promise.all([
            uniswap
            .methods
            .getAmountsOut(
                strategy2DAI[0][1],
                PATH_DAI_ETH
            )
            .call()
        ]);

        const strategy2Rates = {
            DAI: parseFloat(strategy2DAI[0][1] / (10**18)),
            ETH: parseFloat(strategy2ETH[0][1] / (10**18))
        };
        console.log("Estrategia 2");
        console.log(strategy2Rates);

        const tx1 = arbitrage.methods.Strategy1(
           strategy1DAI[0][1],
           strategy1ETH[0][1]
        );

        const tx2 = arbitrage.methods.Strategy2(
            strategy2DAI[0][1],
            strategy2ETH[0][1]
        );

        const gasPrice = await Promise.all([ web3.eth.getGasPrice() ]);
        const nonce = await web3.eth.getTransactionCount(publicKey);
        const txCost = 1000000 * gasPrice;

        const profit1 = (strategy1ETH[0][1] - txCost) - (AMOUNT_ETH_WEI);
        const profit2 = (strategy2ETH[0][1] - txCost)- (AMOUNT_ETH_WEI);

        if(profit1 > 10000000000000000){
            console.log("Comprar en Uniswap y vender en Sushiswap");
            console.log(`Ganancia estimada ${profit1 / (10**18)} ETH`);
            const data = tx1.encodeABI();
            const txData = {
                from: admin,
                to: arbitrage.options.address,
                gas: 500000,
                data: data,
                nonce: nonce
            };
            const receipt = await web3.eth.sendTransaction(txData);
            console.log(`Transaction hash: ${receipt.transactionHash}`);
        }else if(profit2 > 10000000000000000){
            console.log("Comprar en Sushiswap y vender en Uniswap");
            console.log(`Ganancia estimada ${profit2 / (10**18)} ETH`);
            const data = tx2.encodeABI();
            const txData = {
                from: admin,
                to: arbitrage.options.address,
                gas: 500000,
                data: data,
                nonce: nonce
            };
            const receipt = await web3.eth.sendTransaction(txData);
            console.log(`Transaction hash: ${receipt.transactionHash}`);
        } 
    })
    .on('error', error => {
        console.log(error);
    });
}
init();