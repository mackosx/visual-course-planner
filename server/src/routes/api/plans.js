const express = require('express');
const router = express.Router();
const Plan = require('../../models/Plan');

const arrayToObject = (array) => array.reduce((obj, item) => {
  obj[item.id] = item;
  return obj;
}, {});

/**
 * @route GET api/plans/:id
 * @desc Get all informattion about a plan
 * @access Private
 */
router.get('/:id', async (req, res) => {
  const planId = req.params.id;
  try {
    const plan = await Plan.getPlan(planId);
    if (!plan) {
      res.status(200).send({});
      return;
    }
    const courses = await Plan.getPlanCourses(planId);
    const courseIds = courses.map(course => course.courseId.toString());
    const coursesById = arrayToObject(courses.map(course => {
      return {
        id: course.courseId.toString(),
        preRequisites: course.prerequisites ? course.prerequisites.split(',') : [],
        coRequisites: course.corequisites ? course.corequisites.split(',') : [],
        standingRequirement: course.standingRequirement,
        term: course.term.toString(),
        code: course.code
      };
    }));

    const terms = await Plan.getPlanTerms(planId);
    // console.log({"Loading terms": terms});
    const termIds = terms.map(term => term.tid.toString());
    const termsById = arrayToObject(terms.map(term => {
      return {
        id: term.tid.toString(),
        number: term.number,
        session: term.sid.toString(),
        courses: courses.filter(course => course.term === term.tid).map(course => course.courseId.toString())
      };
    }));

    const sessions = await Plan.getPlanSessions(planId);
    const sessionIds = sessions.map(session => session.id.toString());
    const sessionsById = arrayToObject(sessions.map(session => {
      return {
        id: session.id.toString(),
        terms: session.terms.split(',').map(id => id.toString()),
        year: session.year,
        season: session.season
      };
    }));


    let formattedPlan = {
      courses: {
        byId: coursesById,
        allIds: courseIds
      },
      sessions: {
        byId: sessionsById,
        allIds: sessionIds
      },
      terms: {
        byId: termsById,
        allIds: termIds
      },
      name: plan.title,
      description: plan.description,
      specialization: plan.sid,
      isFavourite: plan.isFavourite === 1,
      id: plan.id
    };

    // console.log({"Sending plan": formattedPlan});
    res.status(200).send(formattedPlan);

  } catch(e) {
    // console.error({"Couldn't retrieve plan": e});
    res.status(500).send("Couldn't retrieve plan");
  }
});

/**
 * @route GET api/plans/user/:id
 * @desc Get all of a users plans
 * @access Private
 */
router.get('/user/:id', async (req, res) => {
  const userId = req.params.id;
  // console.log(userId);
  try {
    const plans = await Plan.getPlanList(userId);
    // console.log({"plans": plans});
    res.send(plans);
  } catch(e) {
    // console.error({"Couldn't retrieve plan list": e });
    res.status(500).send({"Couldn't retrieve plan list": e });
  }
});

/**
 * @route POST api/plans/:pid/user/:uid/favourite/:isFavourite
 * @desc Update the favourite status of a users plan
 * @access Private
 */
router.post('/:pid/user/:uid/favourite/:isFavourite', (req, res) => {
  const userId = req.params.uid;
  const planId = req.params.pid;
  const isFavourite = req.params.isFavourite;
  Plan.setFavourite(planId, isFavourite, userId)
    .then(data => {
      res.status(200).send(data);
    })
    .catch(err => {
      console.error({"unable to favourite plan": err});

    });
});

/**
 * @route POST :pid/user/:uid/favourite/:isFavourite
 * @desc Update the favourite status of a users plan
 * @access Private
 */
router.post('/new', async (req, res) => {
  console.log("Creating new plan");
  const userId = req.body.userId;
  const specializationId = req.body.specializationId;
  if (!specializationId) {
    console.log("no degree id");
    res.status(500).send("Need to set specializationId");
    return;
  }

  if (!userId) {
    console.log("no user id");

    res.status(500).send("Need to set userId");
    return;
  }

  try {
    const planId = await Plan.createPlan(userId, "untitled", "", specializationId);
    res.status(200).send("Plan created: " + planId);
    console.log("Plan created: " + planId);
  } catch (e) {
    res.status(500).send({"Error occured": e});
    console.error(e);
  }
});

/**
 * @route POST api/plans/:id/save
 * @desc Save a plan in the database
 * @access Private
 */
router.post('/:id/save', async (req, res) => {
  const planId = req.params.id;
  const plan = req.body.plan;
  const notes = plan.description;
  const isFavourite = plan.isFavourite;
  const name = plan.name;

  const courseIds = plan.courses.allIds;
  Plan.removeCourses(planId);
  for (let courseId of courseIds) {
    console.log(courseId);

    // Check if plan has course in it
    const course = await Plan.getCourseFromPlan(courseId, planId);
    if (!course) {
      try {
        console.log("Saving course " + courseId + " in plan: " + planId);
        await Plan.setPlanCourse(courseId, planId);
        // TODO: need to make sure course are removed as well
      } catch (e) {
        console.error({"Error occured while saving plan courses": e});
      }
    }
  }
  try { // should probably use a transaction
    await Plan.saveNotes(planId, notes);
    await Plan.setFavourite(planId, isFavourite);
    await Plan.setName(planId, name);
    await Plan.setTerms(planId, plan.terms.allIds);
    
    res.status(200).send("Saved planId " + planId);
  } catch(e) {
    console.error({"failed to save": e});
    res.status(500).send("Failed to save");
  }
});

/**
 * @route DELETE api/plans/:id
 * @desc Delete a plan
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  const planId = req.params.id;

  await Plan.deletePlan(planId);
  res.status(200).send("Plan " + planId + " was deleted");
});

/**
 * @route POST api/plans/:id/name/:name
 * @desc Update the name of a plan
 * @access Private
 */
router.post('/:id/name/:name', async (req, res) => {
  const planId = req.params.id;
  const name = req.body.name;
  await Plan.setName(planId, name);
  res.status(200).send("Plan " + planId + " updated name to " + name);

});

/**
 * @route POST api/plans/:id/name/:name
 * @desc Update the description of a plan
 * @access Private
 */
router.post('/:id/description', async (req, res) => {
  const planId = req.params.id;
  const desc = req.body.desc;
  await Plan.saveNotes(planId, desc);
  res.status(200).send("Plan " + planId + " updated desc to " + desc);
});

module.exports = router;
