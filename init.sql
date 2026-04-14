
CREATE TABLE Invoices (
    InvoiceID INT PRIMARY KEY,
    CustomerName VARCHAR(100)
);

CREATE TABLE InvoiceItems (
    ItemID INT PRIMARY KEY,
    InvoiceID INT,
    Name VARCHAR(100),
    Price DECIMAL(10,2),
    FOREIGN KEY (InvoiceID) REFERENCES Invoices(InvoiceID)
);

INSERT INTO Invoices (InvoiceID, CustomerName) VALUES (1, 'John Doe');
INSERT INTO InvoiceItems (ItemID, InvoiceID, Name, Price) VALUES (1, 1, 'Widget A', 19.99);
