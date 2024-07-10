require("dotenv").config();
const express = require("express");
const app = express();

const db = require("./config/db");
db();
