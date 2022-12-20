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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})