# A Market Application written with electron
This is an experimental project, not a serious one.

# System design
## Backend
Backend will be written in javascript with express.js

### Routes
- GET '/' -> Connection control
- POST '/signup' -> signup to sqlite database
- POST '/addcash' -> Will add money at given amount to an account if credentials are correct.
- GET '/products' -> get list of products.
- POST (Admin only) '/addproduct' -> Adds product to products database.
- POST '/buyproduct' -> Buy product.
- POST (Admin only) '/changeprice' -> Change the price of a product

### Databases
- Accounts
- Products
- Purchases

## Frontend
Frontend will be written in javascript with electron.js

# Features
- [x] Accounts (Account information stored in backend database)
- [ ] Add (or remove) goods to basket
- [ ] pay for basket
- [x] Goods' stocks
- [ ] Goods' price history
- [ ] ...
