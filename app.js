const wfMarketTask = require('./wfmarkettask')

async function main() {
    //await wfMarketTask.login();
    await wfMarketTask.test();

    // setTimeout(() => {
    //     console.log("CLICKING VISISBLE BUTTON!")
    //     axios.put(`https://api.warframe.market/v1/profile/orders/${order_id}`, { order_id, visible: 'false'}, {
    //         headers: {
    //             'Authorization': responseLogin.headers.authorization,
    //         }
    //     })
    // }, 9000);

}

main();