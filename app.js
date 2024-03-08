const wfMarketTask = require('./wfmarkettask')

async function main() {
    //await wfMarketTask.login();
    //await wfMarketTask.createOrder({ item_name: 'mirage_prime_systems', cost: 50});
    await wfMarketTask.test();
    // const responseOrder = await wfMarketTask.createOrder(responseLogin);
    // const order_id = responseOrder.data.payload.order.id;

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