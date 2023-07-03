package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"math/big"
)

var salt = []byte("0000000000000000004d6ec16dafe9d8370958664c1dc422f452892264c59526")

const (
	seed   = "9f57575fd54cd441e962448537e155ace9555df10cd27fa817bbcaf48a59ebcf" // from game #1, but could be anything
	games  = 10_000_000_000
	wager  = 100
	target = 2_00 // represents 2.00x
)

func main() {
	hash, err := hex.DecodeString(seed)
	if err != nil {
		panic(err)
	}
	profit := 0

	for game := 1; game <= games; game++ {
		multiplier := bustFromHash(hash)
		if multiplier >= target {
			// we won
			profit += (wager * (target - 100)) / 100
		} else {
			// we lost
			profit -= wager
		}
		if game%1_000_000 == 0 {
			progress := float64(game) / float64(games) * 100
			wagered := game * wager
			impliedEdge := (float64(profit) / float64(wagered)) * -100.0
			fmt.Printf("%.2f%%\t%d bits\t%.4f%%\n", progress, wagered, impliedEdge)
		}

		hashArray := sha256.Sum256([]byte(hex.EncodeToString(hash)))
		hash = hashArray[:]
	}

	wagered := games * wager
	fmt.Printf("Wagered:\t\t%d bits\n", wagered/100)
	fmt.Printf("P&L:\t\t\t%d bits\n", profit)
	fmt.Printf("Implied house edge:\t%.4f%%", (float64(profit)/float64(wagered))*-100.0)
}

func bustFromHash(hash []byte) float64 {
	const nBits = 52 // number of most significant bits to use

	// 1. HMAC_SHA256(key=salt, message=hash)
	hmacHash := hmac.New(sha256.New, salt)
	hmacHash.Write(hash)
	seed := hmacHash.Sum(nil)

	// 2. r = seed >> 204 (52 bits remaining)
	seedInt := new(big.Int).SetBytes(seed)
	seedInt.Rsh(seedInt, sha256.Size*8-nBits)
	r := seedInt.Uint64()

	// 3. X = r / 2^52
	X := float64(r) / math.Pow(2, nBits) // uniformly distributed in [0; 1)

	// 4. X = 99 / (1-X)
	X = 99 / (1 - X)

	return math.Max(100, math.Floor(X))
}