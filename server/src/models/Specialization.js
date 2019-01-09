const promisify = require('util').promisify;
const db = require('../../../dbconnection');
db.query = promisify(db.query);


module.exports = {
  async createSpecialization(specialization) {
    const results = await db.query("INSERT INTO specialization (name, did) VALUES (?, ?)", [specialization.name, specialization.degreeId]);
    return results.insertId;
  },

  async createSpecializationRequirement(requirementObj, specId) {
    // make transaction
    const req = requirementObj.requirements;
    const exception = requirementObj.exceptions;
    const hasException = exception.length > 0 ? true : false;

    const COURSES_TYPE = 'courses';
    const CATEGORY_TYPE = 'category';

    if (req.type === COURSES_TYPE) {
      const results = await db.query("INSERT INTO credit_requirement (credits, category) VALUES (?, ?)", [req.credits, null]);
      const crid = results.insertId;
      await db.query("INSERT INTO specialization_credit_requirement (spid, crid) VALUES (?, ?)", [specId, crid]);
      req.courses.forEach(async course => {
        // could catch error here if the course info does not exist 
        db.query("INSERT INTO credit_requirement_course_info (crid, cid) VALUES (?, ?)", [crid, course]);
      });
    } else if (req.type === CATEGORY_TYPE) {
      db.query("INSERT INTO credit_requirement (credits, category) VALUES (?, ?)", [req.credits, req.courses]);
    }

    if (hasException) {  
      if (exception.type === COURSES_TYPE) {
        const exception = await db.query("INSERT INTO exception (category) VALUES (NULL)");
        const eid = exception.insertId;
        exception.courses.forEach(course => {
          db.query("INSERT INTO exception_course_info (eid, cid) VALUES (?, ?)", [eid, course]);
        });
      } else if (exception.type === CATEGORY_TYPE) {
        const exception = await db.query("INSERT INTO exception (category) VALUES (?)", [exception.courses]);
      }
    }
  },

  async getSpecializationRequirements(specId) {
    const results = await db.query(`
      SELECT *
      FROM specialization_credit_requirement AS scr JOIN credit_requirement AS cr ON scr.crid = cr.id
      LEFT JOIN credit_requirement_course_info AS crci ON crci.cid = cr.id
      JOIN course_info AS ci ON ci.id = crci.cid
      WHERE spid = ?`, [specId]);
    return results;
  }
};