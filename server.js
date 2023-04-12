let express = require("express");
const { Client } = require("pg");
let fs = require("fs");

let app = express();
app.use(express.json());
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Methods",
		"GET,POST,OPTIONS,PUT,PATCH,DELETE,HEAD"
	);
	res.header(
		"Access-Control-Allow-Headers",
		"Origin,X-Requested-With,Content-Type,Accept"
	);
	next();
});

var port = process.env.PORT || 2410;
app.listen(port, () => console.log(`Node app listening on port ${port}`));

const connection = new Client({
	user: "postgres",
	password: "ABabluKumar",
	database: "postgres",
	port: 5432,
	host: "db.lwjkdhdkfsmentvysimf.supabase.co",
	ssl: { rejectUnauthorized: false },
});
connection.connect(function (res, error) {
	console.log(`Connected!!!`);
});

app.get("/shops", (req, res) => {
	connection.query("select * from shops", (err, result) => {
		if (err) console.log(err);
		else res.send(result.rows);
	});
});

app.post("/shops", function (req, res) {
	let body = req.body;
	connection.query("select * from shops", (err, data) => {
		if (err) console.log(err);
		else {
			let values = Object.values(body);
			connection.query(
				"insert into shops(name,rent) values($1,$2)",
				values,
				(err, data) => {
					if (err) console.log(err);
					else res.send(data.rows);
				}
			);
		}
	});
});

app.get("/products", (req, res) => {
	connection.query("select * from products", (err, data) => {
		if (err) console.log(err);
		else res.send(data.rows);
	});
});

app.post("/products", function (req, res) {
	let body = req.body;
	connection.query("select * from products", (err, data) => {
		if (err) console.log(err);
		else {
			let values = Object.values(body);
			connection.query(
				"insert into products(productname,category,description) values($1,$2,$3)",
				values,
				(err) => {
					if (err) console.log(err);
					else res.send("inserted");
				}
			);
		}
	});
});

app.put("/products/:id", function (req, res) {
	let body = req.body;
	let id = +req.params.id;
	let values = Object.values(body);

	connection.query(
		"update products set productname=$2,category=$3,description=$4 where productid=$1",
		values,
		(err) => {
			if (err) console.log(err);
			else res.send("updated");
		}
	);
});

app.get("/purchases", (req, res) => {
	let { shop, product, sort } = req.query;
	connection.query("select * from purchases", (err, data) => {
		if (err) console.log(err);
		else {
			let purchases = data.rows;
			connection.query("select * from shops", (err, result) => {
				if (err) console.log(err);
				else {
					let shops = result.rows;
					connection.query("select * from products", (err, result) => {
						if (err) console.log(err);
						else {
							let products = result.rows;
							let arr1 = [...purchases];
							if (shop) {
								arr1 = arr1.filter((a) => a.shopid === +shop);
							}
							if (product) {
								let ids = product.split(",");

								arr1 = arr1.filter(
									(a) => ids.findIndex((i) => i == a.productid) >= 0
								);
							}
							if (sort) {
								if (sort === "QtyAsc")
									arr1.sort((a, b) => a.quantity - b.quantity);
								if (sort === "QtyDesc")
									arr1.sort((a, b) => b.quantity - a.quantity);
								if (sort === "ValueAsc")
									arr1.sort(
										(a, b) => a.price * a.quantity - b.price * b.quantity
									);
								if (sort === "ValueDesc")
									arr1.sort(
										(a, b) => -1 * (a.price * a.quantity - b.price * b.quantity)
									);
							}
							res.send(arr1);
						}
					});
				}
			});
		}
	});
});

app.get("/purchases/shops/:id", (req, res) => {
	let id = +req.params.id;
	connection.query("select * from purchases", (err, data) => {
		if (err) console.log(err);
		else res.send(data.rows.filter((p) => p.shopid === id));
	});
});

app.get("/purchases/products/:id", (req, res) => {
	let id = +req.params.id;
	connection.query("select * from purchases", (err, data) => {
		if (err) console.log(err);
		else res.send(data.rows.filter((p) => p.productid === id));
	});
});

app.get("/totalPurchase/shop/:id", (req, res) => {
	let shopid = +req.params.id;

	connection.query("select * from purchases", (err, result) => {
		if (err) console.log(err);
		else {
			let purchases = result.rows;
			const totalPurchaseByProduct = purchases
				.filter((purchase) => purchase.shopid === shopid)
				.reduce((acc, purchase) => {
					const productid = purchase.productid;
					const quantity = purchase.quantity;
					let price = purchase.price;
					if (acc[productid]) {
						acc[productid] += quantity * price;
					} else {
						acc[productid] = quantity * price;
					}
					return acc;
				}, {});

			res.send(totalPurchaseByProduct);
		}
	});
});

app.get("/totalPurchase/product/:id", (req, res) => {
	let productid = +req.params.id;

	connection.query("select * from purchases", (err, result) => {
		if (err) console.log(err);
		else {
			let purchases = result.rows;
			const totalPurchaseByShop = purchases
				.filter((purchase) => purchase.productid === productid)
				.reduce((acc, purchase) => {
					const shopid = purchase.shopid;
					const quantity = purchase.quantity;
					let price = purchase.price;
					if (acc[shopid]) {
						acc[shopid] += quantity * price;
					} else {
						acc[shopid] = quantity * price;
					}
					return acc;
				}, {});

			res.send(totalPurchaseByShop);
		}
	});
});

app.post("/purchases", function (req, res) {
	let body = req.body;

	connection.query("select * from purchases", (err, result) => {
		if (err) console.log(err);
		else {
			let purchases = result.rows;
			let maxid = purchases.reduce(
				(acc, curr) => (curr.purchaseid > acc ? curr.purchaseid : acc),
				0
			);
			let newid = maxid + 1;
			let newPurchase = { purchaseid: newid, ...body };
			purchases.push(newPurchase);
			let values = Object.values(purchases);
			connection.query(
				"insert into purchases(purchaseid,shopid,productid,quantity,price) values($1,$2,$3,$4,$5)",
				values,
				(err) => {
					if (err) console.log(err);
				}
			);
		}
	});
});
