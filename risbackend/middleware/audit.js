module.exports = (action) => async (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode < 400) {
      await req.db.query(
        `INSERT INTO audit_logs(user_id, action, entity, entity_id)
         VALUES ($1,$2,$3,$4)`,
        [
          req.user?.id,
          action,
          "report",
          req.body.studyUID || req.params.studyId
        ]
      );
    }
  });
  next();
};
