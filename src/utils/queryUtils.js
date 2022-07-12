const pool = require('../../config/index')

exports.transactionsEndpoints = {
    depositEndpoint: 'deposit',
    withdrawEndpoint: 'withdraw',
    transferEndpoint: 'transfer',
}

exports.transactionQueries = async (transaction_type, user_id, amount, dest_acc_id, source_acc_id, testDate) => {

    if (!testDate) {
        if (source_acc_id) {
            await pool.query('INSERT INTO transactions (transaction_type, user_id, amount, dest_acc_id, source_acc_id) VALUES ($1, $2, $3, $4, $5)',
                [transaction_type, user_id, amount, dest_acc_id, source_acc_id])

        } else {
            await pool.query('INSERT INTO transactions (transaction_type, user_id, amount, dest_acc_id) VALUES ($1, $2, $3, $4)', [transaction_type, user_id, amount, dest_acc_id])
        }
    } else {
        //test order by date
        if (source_acc_id) {
            await pool.query('INSERT INTO transactions (transaction_type, user_id, amount, dest_acc_id, source_acc_id, t_date) VALUES ($1, $2, $3, $4, $5, $6)',
                [transaction_type, user_id, amount, dest_acc_id, source_acc_id, testDate])

        } else {
            await pool.query('INSERT INTO transactions (transaction_type, user_id, amount, dest_acc_id, t_date) VALUES ($1, $2, $3, $4, $5)', [transaction_type, user_id, amount, dest_acc_id, testDate])
        }
    }
}

exports.envelopeTransactionsQuery = async (transactionType, budget, user_id, envelopeDestinationId, envelopeSourceId) => {
    let result;
    if (transactionType === this.transactionsEndpoints.depositEndpoint) {
        const query = `UPDATE envelopes SET budget = (budget + $1) WHERE user_id = ($2) AND env_id = ($3) RETURNING *;`
        result = await pool.query(query, [budget, user_id, envelopeDestinationId])

    } else if (transactionType === this.transactionsEndpoints.withdrawEndpoint) {
        const query = `UPDATE envelopes SET budget = (budget - $1) WHERE user_id = ($2) AND env_id = ($3) RETURNING *;`
        result = await pool.query(query, [budget, user_id, envelopeDestinationId])
    } else if (transactionType === this.transactionsEndpoints.transferEndpoint) {
        await pool.query(`UPDATE envelopes SET budget = (budget - $1) WHERE user_id = ($2) AND env_id = ($3) RETURNING *`, [budget, user_id, envelopeSourceId])
        result = await pool.query(`UPDATE envelopes SET budget = (budget + $1) WHERE user_id = ($2) AND env_id = ($3) RETURNING *`, [budget, user_id, envelopeDestinationId])
    } else {
        throw new Error('Invalid Transaction Type')
    }

    return result

}
//to_char(transactions.t_date,'DD/MM/YYYY') As NewDateFormat
exports.joinTransactionsQuery = async (user_id) => {

    const transactionJoinResult = await pool.query(
        `SELECT 
        transactions.transaction_id,        
        transactions.t_date,
        to_char(transactions.t_date,'DD/MM/YYYY') As NewDateFormat,
        transactions.transaction_type,   
        transactions.amount,
        dest.title AS "ENVELOPE DESTINATION",
        src.title AS "ENVELOPE SOURCE"
        FROM transactions
            LEFT OUTER JOIN envelopes as dest
                ON transactions.dest_acc_id = dest.env_id
            LEFT OUTER JOIN envelopes as src
                ON transactions.source_acc_id = src.env_id
        GROUP BY transactions.transaction_id, transactions.t_date, transactions.transaction_type, transactions.amount, dest.title, src.title, transactions.user_id
        HAVING transactions.user_id = ($1)
        ORDER BY transactions.t_date DESC`,
        [user_id]
    )

    let finalObj = {}
    transactionJoinResult.rows.forEach((transaction) => {
       
        const date = transaction.newdateformat
        if (finalObj[date]) {
          finalObj[date].push(transaction);
        } else {
          finalObj[date] = [transaction];
        }
      })
      
      let resultData = []
      for(let key in finalObj) {
        
       resultData.push({
        date: key,
        info:[
            ...finalObj[key]
        ]
        
       })
      }
      
    return resultData

}




