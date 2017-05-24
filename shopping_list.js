/**
 * ============================================================================
 * @fileOverview Example code to show the principles of functional programming
 * in a practical situation.
 * 
 * In this example, we calculate a shopping bill from a basket of items and a
 * list of stock items.  Multi-buy discounts can also be applied when you buy
 * various quantities of some items
 * 
 * The primary identifier for a stock item will be its SKU (Stock Keeping Unit)
 * 
 * Author : Chris Whealy chris.whealy@sap.com
 * ============================================================================
 **/

// Generic Item constructor 
function Item(desc, unitPrice) {
  this.desc      = desc
  this.unitPrice = unitPrice
}

// Generic discount constructor
function Discount(qty, amount) {
  this.qty    = qty
  this.amount = amount
}

// Generic bill item
function BillItem(qty, item, discount) {
  this.qty      = qty
  this.item     = item
  this.discount = discount

  this.price = () => calcPrice(this.qty)(this.item.unitPrice)(this.discount)
}

const UNKNOWN_SKU_TXT = "Unknown SKU"
const UNKNOWN_SKU     = new Item(UNKNOWN_SKU_TXT, 0)
const NO_DISCOUNT     = new Discount(1,0)
const GBP             = "&pound;"
const EURO            = "&euro;"
const USD             = '&#36;'
const CURRENCY        = GBP

// ----------------------------------------------------------------------------
// HTML utility functions
var isEmpty = tagName => [
  'area',  'base',    'basefont', 'br',
  'col',   'frame',   'hr',       'img',
  'input', 'isindex', 'link',     'meta',
  'param', 'command', 'keygen',   'source'].indexOf(tagName) >= 0

var argsToArgStr = (acc, arg) => acc + " " + arg[0] + "=" + arg[1]

var makeHtmlElement = tagName => args => content =>
  (argList => "<" + tagName + argList + ">" +
              content +
              (isEmpty(tagName) ? "" : "</" + tagName + ">"))
  (args !== undefined && args.length > 0 ? args.reduce(argsToArgStr,"") : "")

var makeTableCell      = makeHtmlElement("td")(undefined)
var make2TableCells    = makeHtmlElement("td")([["colspan","2"]])
var makeTableCellRight = makeHtmlElement("td")([["class","right"]])
var makeTableCellTotal = makeHtmlElement("td")([["class","total"]])
var makeTableRow       = makeHtmlElement("tr")(undefined)
var makeTotalRow       = str => makeTableRow(makeTableCell("") +
                                             makeTableCellTotal("Total") +
                                             makeTableCellTotal(zeroPadPrice(str)))
var makeTable          = makeHtmlElement("table")(undefined)

var zeroPadPrice = p =>
  CURRENCY + (p / 100) + (p % 100 === 0 ? ".00" : p % 10 === 0 ? "0" : "")

var discountTxt = disc => qty =>
  (disc > 0) ? " (" + zeroPadPrice(disc) + " off for buying " + qty + ")"
             : ""

// ----------------------------------------------------------------------------
// Items in stock
// All prices are stored in pennies until the bill is printed.
//  Only at that point is the decimal formatting applied
var stockList = new Map([
  [ 670, new Item("Apples (pack of 5)", 194)]
 ,[5243, new Item("Bananas (1kg)", 268)]
 ,[3317, new Item("Oranges (pack of 5)", 150)]
 ,[5712, new Item("Pineapple", 259)]
 ,[8903, new Item("Mango", 75)]
 ,[ 643, new Item("Potatoes (2.5kg)", 198)]
 ,[  57, new Item("Tomatoes (1kg)", 199)]
 ,[  56, new Item("Onions (pack of 4)", 83)]
 ,[1094, new Item("Lettuce", 49)]
 ,[2275, new Item("Rice (1kg)",	148)]
 ,[6034, new Item("Pasta (1kg)", 120)]
 ,[5907, new Item("Bread (800g loaf)", 145)]
 ,[3111, new Item("Pizza (350g)", 260)]
 ,[ 554, new Item("Beef Mince (500g)", 199)]
 ,[1373, new Item("Chicken Breast (pack of 2)", 300)]
 ,[6564, new Item("Salmon Fillets (pack of 2)", 323)]
 ,[7102, new Item("Pasta Sauce (500g jar)", 184)]
 ,[5079, new Item("Curry Sauce (500g jar)", 184)]
 ,[6386, new Item("Cheese (250g)", 174)]
 ,[ 347, new Item("Butter (250g)", 152)]
 ,[1019, new Item("Plain Yoghurt (500g)",	94)]
 ,[9190, new Item("Milk (568ml / 1 pint)",	68)]
 ,[6487, new Item("Milk (2.27L / 4 pints)", 219)]
 ,[4705, new Item("Fresh Orange Juice (1L)", 169)]
 ,[3263, new Item("Cola (2L)", 99)]
 ,[6469, new Item("Beer (pack of 4 bottles)", 400)]
 ,[5671, new Item("Red wine (70cl bottle)",750)]
 ,[4719, new Item("Fish Fingers (500g)", 335)]
 ,[5643, new Item("Soap Powder", 500)]
 ,[1234, new Item("Dry Sherry, 1lt", 1010)]
])

// ----------------------------------------------------------------------------
// The current shopping basket
var basket = [670,3317,643,1234,5907,6034,670,1234,5671,7102,7102,1094,1373,7102,5671,6469]

// ----------------------------------------------------------------------------
// What items are discounted?
var discountedSkus = new Map([
  [1234, new Discount(2,250)]
 ,[5671, new Discount(2,125)]
 ,[7102, new Discount(3,50)]
])

// ----------------------------------------------------------------------------
// Get an item from a generic map object
//
// If the item being searched for is not found, whatever value is specified as
// the notThereValue is returned.  This avoids the calling function needing to
// test for a return value of undefined.
// The value specified for notThereValue should be of the same data type as the
// objects in the map.
var genericMapGet = someMap => notThereValue => theThing =>
  (v => (v === undefined) ? notThereValue : v)
  (someMap.get(theThing))

// ----------------------------------------------------------------------------
// Read SKU from generic stock list
var readItem = genericMapGet(stockList)(UNKNOWN_SKU)

// Fetch the discount for a given SKU (which might be zero)
var readDiscount = genericMapGet(discountedSkus)(NO_DISCOUNT)

// ----------------------------------------------------------------------------
// Increment the quantity for an existing item on the bill
var updateQty = bill => sku =>
  (billItem => 1 + (billItem === undefined ? 0 : billItem.qty))
  (bill.get(sku))

// ----------------------------------------------------------------------------
// Add an item in the shopping basket to the bill.
// Discounts amounts cannot be calculated until after all the items in the
// shopping basket have been added to the bill
var addItemToBill = (acc, sku) =>
  // The inner function receives three arguments: the item quantity, and the
  // item and discount objects
  (newQty => item => discount =>
    // If the item is an unknown SKU, then ignore it by simply returning the
    // accumulator, else add/update the item to/in the accumulator
    (item.desc === UNKNOWN_SKU_TXT)
    ? acc
    : acc.set(sku, new BillItem(newQty, item, discount))
  )
  // First, update the billed quantity for this item and read both the sku and
  // discount objects.  Pass all of these as arguments to the inner function
  (updateQty(acc)(sku))
  (readItem(sku))
  (readDiscount(sku))

// ----------------------------------------------------------------------------
// Pricing functions
var calcPrice = qty => unitPrice => discount =>
  // Inner function takes the discount as its argument
  (disc => calcAmount(qty)(unitPrice)(disc))
  // Calculate discount and pass it to the inner function
  (calcDiscount(qty)(discount.qty)(discount.amount))

var calcDiscount = itemQty => discountQty => discountAmt => Math.floor(itemQty / discountQty) * discountAmt
var calcAmount   = itemQty => unitPrice   => discount    => (itemQty * unitPrice) - discount

// ----------------------------------------------------------------------------
// Convert stock item to the row of an HTML table
var stockItemAsHtmlTableRow = (acc, val) =>
  acc +
  makeTableRow(makeTableCell(val.desc) +
               makeTableCellRight(zeroPadPrice(val.unitPrice)))

// Convert stock list to an HTML table
var stockListAsHtml = div => sl =>
  document.getElementById(div).innerHTML =
    makeTable(Array.from(sl.values()).reduce(stockItemAsHtmlTableRow, ""))

// ----------------------------------------------------------------------------
// Convert a single bill item to a row of an HTML table
var billItemAsHtmlTableRow = (acc, item) =>
  acc + 
  // Inner function receives the item discount (if any)
  (disc =>
    // Create the item table row inserting the quantity
    makeTableRow(makeTableCellRight(item.qty) + 
                 // Item description with optional discount text
                 makeTableCell(item.item.desc + 
                               // Optional discount text
                               discountTxt(disc)(item.qty)) + 
                 // Total item price
                 makeTableCellRight(zeroPadPrice(item.price()))))
  // Call inner function passing in the discount amount for this item
  (calcDiscount(item.qty)(item.discount.qty)(item.discount.amount))

// Convert the whole bill to an HTML table
var billAsHtmlTable = div => billArray => total =>
  document.getElementById(div).innerHTML = 
    makeTable(billArray.reduce(billItemAsHtmlTableRow, "") +
              makeTotalRow(total))

// ----------------------------------------------------------------------------
// This function is run when the document onLoad event goes off
var displayScreen = () => {
  // Write stock list to the screen
  stockListAsHtml("stockListDiv")(stockList);

  // Inner function 1: wrapper for converting the billMap to an array
  (billMap =>
    // Inner function 2: wrapper for calculating total bill
    (billArray =>
      // Inner function 3: Write bill to the screen
      (total => billAsHtmlTable("billDiv")(billArray)(total))
      // Calculate total bill and pass as argument to inner function 3
      (billArray.reduce((acc, item) => acc + item.price(), 0))
    )
    // Convert billMap object to an array and pass it to inner function 2
    (Array.from(billMap.values()))
  )
  // Calculate the total price of all basket items and pass this as an argument
  // to inner function 1
  (basket.reduce(addItemToBill, new Map()))
}
