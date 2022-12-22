const express = require("express");
const sql = require("sqlite3").verbose();
const app = express();
const port = 8080;
const db = new sql.Database("./market.db", sql.OPEN_READWRITE, (err)=>{
    if(err) return console.error(err.message);
});

app.use(express.json());

function IsUsernameUnique(username) { // returns a number
    return new Promise((res, rej) => {
        db.all("select count(username) from accounts where username=?", [username], (err, rows)=>{
            if(err) return rej(err.message);
            //console.log(rows[0]['count(username)'])
            res(rows[0]['count(username)'] == 0)
        });
    });
}

function IsPasswordValid(password) { // returns a boolean
    if(password.length < 8 || password.length > 16) return false;
    // TODO: control if a password is just numbers
    return true;
}

function Authenticate(username, password) {
    return new Promise((res, rej)=> {
        db.all("select count(*) from accounts where username=? and password=?", [username, password], (err, rows) => {
            if(err) rej(err.message);
            res(rows[0]['count(*)'] === 1)
        })
    })
}

function IsAdmin(username) {
    return new Promise((res, rej)=>{
        db.all("select isAdmin from accounts where username=?", [username], (err, rows) => {
            if(err) {
                rej(err.message);
            }else {
                res(rows[0]["isAdmin"] === "yes")
            }
        })
    })
}

function AuthenticateAsAdmin(username, password) {
    return new Promise((res, rej)=>{
        Authenticate(username, password).then((v)=>{
            if(!v) {
                rej("Authentication is unsuccessful");
                return;
            }
            IsAdmin(username).then((v)=>{
                if(!v) {
                    rej("User is not an admin")
                    return;
                }
                res();
            }).catch((err)=>{
                if(err){
                    rej(err);
                }
            })
        }).catch((err)=>{
            if(err) {
                rej(err);
            }
        })
    })
}

function GetProduct(name) {
    return new Promise((res, rej)=>{
        db.all("select * from products where name=?", [name], (err, rows)=>{
            if(err) rej(err);
            else {
                res(rows[0]);
            }
        })
    })
}

function StorePurchase(username, productname, sum, number) { // ATTENTION!! This function doesn't control if user is authenticated or not
    return new Promise((res, rej)=>{
        if(!username || !sum || !productname || !number){
            rej("Arguments are not valid.");
            return;
        }
        db.run("insert into purchases (product_name,purchaser_name,purchase_sum,purchase_number,purchase_ts) values (?,?,?,?,?)", [productname,username,sum, number,Date.now()], (err)=>{
            if(err) {
                rej(err.message);
                return;
            }
        });
        res();
    })
}

function BuyProduct(username, password, productname, number) {
    return new Promise((res, rej)=>{
        if(!username || !password || !productname || !number){
            rej("Arguments are not valid.");
            return;
        }
        Authenticate(username, password).then((v)=> {
            if(!v) {
                rej("Authentication is unsuccessful!")
                return;
            }
            db.all("select cash from accounts where username=?", [username], (err,rows)=>{
                if(err) {
                    rej("Can not access account right now!");
                    return console.error(err);
                }
                GetProduct(productname).then((pro)=>{
                    if(!(rows[0]["cash"] >= pro.price && pro.stock >= number)) {
                        rej("insufficient balance")
                        return;
                    }
                    db.run("update accounts set cash=cash-? where username=?", [pro.price, username], (err)=>{
                        if(err) {
                            rej("Can not update cash! " + err.message);
                            return;
                        }
                    });
                    let prebought = pro.bought_by ? pro.bought_by + "," : "";
                    db.run("update products set bought_by = ?, last_bought_ts = ?, stock=stock-? where name=?", [prebought+username, Date.now(), number, productname], (err)=>{
                        if(err) {
                            rej("Can not update product! " + err.message);
                            return;
                        }
                    });
                    StorePurchase(username, productname, pro.price * number, number).then(()=>{
                        res("Successfully bought!");
                    }).catch((err)=>{
                        if(err) {
                            rej("Can not store purchase data! " + err);
                            return;
                        }
                    });
                }).catch((err)=>{
                    rej("Can not get product! " + err)
                    return console.error(err);
                })
                
            })
            
        }).catch((err)=>{
            rej("Cannot authenticate!")
            return console.error(err);
        });
    });
}

app.get('/', (req, res)=>{ // Connection test
    res.send("OK")
})

app.post('/signup', (req, res)=>{ // req.body = {username: "XXX", password: "XXX"}
    if(!req.body.username || !req.body.password){
        res.status(400);
        res.send("Username and password must be provided!");
    }else {
        IsUsernameUnique(req.body.username).then((v)=> {
            if(v && IsPasswordValid(req.body.password)) {
                const ts = Date.now();
                db.run("insert into accounts (username,password,account_created_ts,account_last_ts,cash) values (?,?,?,?,?)", [req.body.username, req.body.password, ts, ts, 0], (err) => {
                    if(err){
                        res.status(500);
                        res.send(err.message)
                        return console.error(err.message);
                    }
                })
                res.status(200);
                res.send("Account successfully created!")
            }else {
                if(!IsPasswordValid(req.body.password)) {
                    res.status(400);
                    res.send("Password is not valid!")
                }
                res.status(400);
                res.send("Username is not unique or password is not valid!")
            }
        }).catch((err)=> {if(err) return console.error(err)})
    }
})

app.post('/addcash', (req, res)=> {
    if(!req.body.username || !req.body.password || !req.body.amount){
        res.status(400);
        res.send("Username, password and amount must be provided!");
    }else {
        let a = parseInt(req.body.amount);
        if(isNaN(a)) {
            res.status(400);
            res.send("Amount must be a number!");
        }
        Authenticate(req.body.username, req.body.password).then((v)=> {
            if(v) { // Authentication is successful.
                db.run("update accounts set cash=cash + ? where username=?", [a, req.body.username], (err)=> {
                    if(err) {
                        res.status(500)
                        res.send(err.message)
                        return console.error(err.message);
                    }
                })
                res.status(200)
                res.send("Money added successfully!")
            }else { // Authentication is unsuccessful.
                res.status(400)
                res.send("Authentication is unsuccessful!")
            }
        }).catch((err)=>console.error(err))
    }
})

app.post('/addproduct', (req, res)=>{ // req.body = {username, password, name (product name), stock, price}
    if(!req.body.username || !req.body.password || !req.body.name || !req.body.stock || !req.body.price){
        res.status(400);
        res.send("Username, password and amount must be provided!");
    }else {
        AuthenticateAsAdmin(req.body.username, req.body.password).then(()=>{
            db.run("insert into products (name,stock,price) values (?,?,?)", [req.body.name, req.body.stock, req.body.price], (err)=>{
                if(err){
                    res.status(500);
                    res.send("Can not create product! " + err.message);
                    return console.error(err.message);
                }else {
                    res.status(200)
                    res.send("Product successfully created!");
                }
            })
        }).catch((err)=>{
            if(err) {
                res.status(400);
                res.send("Authentication is unsuccessful! " + err);
            }
        })
    }
})

app.get('/products', (req, res)=>{
    db.all("select name, stock, price from products", [], (err, rows)=>{
        if(err) {
            res.status(500);
            res.send("Can not list products!");
            return console.error(err.message);
        }else {
            res.status(200);
            res.send(JSON.stringify({data: rows}))
        }
    })
})

app.post('/buyproduct', (req, res)=>{ // req.body = {username, password, name (product name), number}
    BuyProduct(req.body.username, req.body.password, req.body.name, req.body.number).then((v)=>{
        res.status(200);
        res.send(v);
    }).catch((err)=>{
        if(err) {
            res.status(400);
            res.send(err);
        }
    })
})

app.post('/changeprice', (req, res)=>{ // req.body = {username, password, productname, newprice}
    if(!req.body.username || !req.body.password || !req.body.productname || !req.body.newprice || req.body.newprice < 0) {
        res.status(400);
        res.send("Invalid arguments!");
        return;
    }
    AuthenticateAsAdmin(req.body.username, req.body.password).then(()=>{
        db.run("update products set price=? where name=?", [req.body.newprice, req.body.productname], (err)=>{
            if(err) {
                res.status(500);
                res.send("Can not update products price! " + err.message);
                return;
            }
            res.status(200);
            res.send("Successfully changed price!")
        })
    }).catch((err)=>{
        if(err){
            res.status(400);
            res.send("Can not change price! " + err);
        }
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})