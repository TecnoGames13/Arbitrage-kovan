const arbitrageKovan = require('./arbitrage-kovan.json');
const sushiswapKovan = require('./sushiswap-kovan.json');
const uniswapKovan = require('./uniswap-kovan.json');
const tokensKovan = require('./tokens-kovan.json');

module.exports = {
  kovan: {
    arbitrage: arbitrageKovan,
    sushiswap: sushiswapKovan,
    uniswap: uniswapKovan,
    tokens: tokensKovan
  }
};
