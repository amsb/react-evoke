const quotes = [
  {
    title: "Care About Your Craft",
    description:
      "Why spend your life developing software unless you care about doing it well?",
  },
  {
    title: "Think! About Your Work",
    description:
      "Turn off the autopilot and take control. Constantly critique and appraise your work.",
  },
  {
    title: "Provide Options, Don't Make Lame Excuses",
    description:
      "Instead of excuses, provide options. Don't say it can't be done; explain what can be done.",
  },
  {
    title: "Don't Live with Broken Windows",
    description:
      "Fix bad designs, wrong decisions, and poor code when you see them.",
  },
  {
    title: "Be a Catalyst for Change",
    description:
      "You can't force change on people. Instead, show them how the future might be and help them participate in creating it.",
  },
  {
    title: "Remember the Big Picture",
    description:
      "Don't get so engrossed in the details that you forget to check what's happening around you.",
  },
  {
    title: "Make Quality a Requirements Issue",
    description:
      "Involve your users in determining the project's real quality requirements.",
  },
  {
    title: "Invest Regularly in Your Knowledge Portfolio",
    description: "Make learning a habit.",
  },
  {
    title: "Critically Analyze What You Read and Hear",
    description:
      "Don't be swayed by vendors, media hype, or dogma. Analyze information in terms of you and your project.",
  },
  {
    title: "It's Both What You Say and the Way You Say It",
    description:
      "There's no point in having great ideas if you don't communicate them effectively.",
  },
  {
    title: "DRY – Don't Repeat Yourself",
    description:
      "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.",
  },
  {
    title: "Make It Easy to Reuse",
    description:
      "If it's easy to reuse, people will. Create an environment that supports reuse.",
  },
  {
    title: "Eliminate Effects Between Unrelated Things",
    description:
      "Design components that are self-contained. independent, and have a single, well-defined purpose.",
  },
  {
    title: "There Are No Final Decisions",
    description:
      "No decision is cast in stone. Instead, consider each as being written in the sand at the beach, and plan for change.",
  },
  {
    title: "Use Tracer Bullets to Find the Target",
    description:
      "Tracer bullets let you home in on your target by trying things and seeing how close they land.",
  },
  {
    title: "Prototype to Learn",
    description:
      "Prototyping is a learning experience. Its value lies not in the code you produce, but in the lessons you learn.",
  },
  {
    title: "Program Close to the Problem Domain",
    description: "Design and code in your user's language.",
  },
  {
    title: "Estimate to Avoid Surprises",
    description:
      "Estimate before you start. You'll spot potential problems up front.",
  },
  {
    title: "Iterate the Schedule with the Code",
    description:
      "Use experience you gain as you implement to refine the project time scales.",
  },
  {
    title: "Keep Knowledge in Plain Text",
    description:
      "Plain text won't become obsolete. It helps leverage your work and simplifies debugging and testing.",
  },
  {
    title: "Use the Power of Command Shells",
    description: "Use the shell when graphical user interfaces don't cut it.",
  },
  {
    title: "Use a Single Editor Well",
    description:
      "The editor should be an extension of your hand; make sure your editor is configurable, extensible, and programmable.",
  },
  {
    title: "Always Use Source Code Control",
    description:
      "Source code control is a time machine for your work – you can go back.",
  },
  {
    title: "Fix the Problem, Not the Blame",
    description:
      "It doesn't really matter whether the bug is your fault or someone else's – it is still your problem, and it still needs to be fixed.",
  },
  {
    title: "Don't Panic When Debugging",
    description:
      "Take a deep breath and THINK! about what could be causing the bug.",
  },
  {
    title: '"select" Isn\'t Broken.',
    description:
      "It is rare to find a bug in the OS or the compiler, or even a third-party product or library. The bug is most likely in the application.",
  },
  {
    title: "Don't Assume It – Prove It",
    description:
      "Prove your assumptions in the actual environment – with real data and boundary conditions.",
  },
  {
    title: "Learn a Text Manipulation Language.",
    description:
      "You spend a large part of each day working with text. Why not have the computer do some of it for you?",
  },
  {
    title: "Write Code That Writes Code",
    description:
      "Code generators increase your productivity and help avoid duplication.",
  },
  {
    title: "You Can't Write Perfect Software",
    description:
      "Software can't be perfect. Protect your code and users from the inevitable errors.",
  },
  {
    title: "Design with Contracts",
    description:
      "Use contracts to document and verify that code does no more and no less than it claims to do.",
  },
  {
    title: "Crash Early",
    description:
      "A dead program normally does a lot less damage than a crippled one.",
  },
  {
    title: "Use Assertions to Prevent the Impossible",
    description:
      "Assertions validate your assumptions. Use them to protect your code from an uncertain world.",
  },
  {
    title: "Use Exceptions for Exceptional Problems",
    description:
      "Exceptions can suffer from all the readability and maintainability problems of classic spaghetti code. Reserve exceptions for exceptional things.",
  },
  {
    title: "Finish What You Start",
    description:
      "Where possible, the routine or object that allocates a resource should be responsible for deallocating it.",
  },
  {
    title: "Minimize Coupling Between Modules",
    description:
      'Avoid coupling by writing "shy" code and applying the Law of Demeter.',
  },
  {
    title: "Configure, Don't Integrate",
    description:
      "Implement technology choices for an application as configuration options, not through integration or engineering.",
  },
  {
    title: "Put Abstractions in Code, Details in Metadata",
    description:
      "Program for the general case, and put the specifics outside the compiled code base.",
  },
  {
    title: "Analyze Workflow to Improve Concurrency",
    description: "Exploit concurrency in your user's workflow.",
  },
  {
    title: "Design Using Services",
    description:
      "Design in terms of services – independent, concurrent objects behind well-defined, consistent interfaces.",
  },
  {
    title: "Always Design for Concurrency",
    description:
      "Allow for concurrency, and you'll design cleaner interfaces with fewer assumptions.",
  },
  {
    title: "Separate Views from Models",
    description:
      "Gain flexibility at low cost by designing your application in terms of models and views.",
  },
  {
    title: "Use Blackboards to Coordinate Workflow",
    description:
      "Use blackboards to coordinate disparate facts and agents, while maintaining independence and isolation among participants.",
  },
  {
    title: "Don't Program by Coincidence",
    description:
      "Rely only on reliable things. Beware of accidental complexity, and don't confuse a happy coincidence with a purposeful plan.",
  },
  {
    title: "Estimate the Order of Your Algorithms",
    description:
      "Get a feel for how long things are likely to take before you write code.",
  },
  {
    title: "Test Your Estimates",
    description:
      "Mathematical analysis of algorithms doesn't tell you everything. Try timing your code in its target environment.",
  },
  {
    title: "Refactor Early, Refactor Often",
    description:
      "Just as you might weed and rearrange a garden, rewrite, rework, and re-architect code when it needs it. Fix the root of the problem.",
  },
  {
    title: "Design to Test",
    description:
      "Start thinking about testing before you write a line of code.",
  },
  {
    title: "Test Your Software, or Your Users Will",
    description: "Test ruthlessly. Don't make your users find bugs for you.",
  },
  {
    title: "Don't Use Wizard Code You Don't Understand",
    description:
      "Wizards can generate reams of code. Make sure you understand all of it before you incorporate it into your project.",
  },
  {
    title: "Don't Gather Requirements – Dig for Them",
    description:
      "Requirements rarely lie on the surface. They're buried deep beneath layers of assumptions, misconceptions, and politics.",
  },
  {
    title: "Work With a User to Think Like a User",
    description:
      "It's the best way to gain insight into how the system will really be used.",
  },
  {
    title: "Abstractions Live Longer than Details",
    description:
      "Invest in the abstraction, not the implementation. Abstractions can survive the barrage of changes from different implementations and new technologies.",
  },
  {
    title: "Use a Project Glossary",
    description:
      "Create and maintain a single source of all the specific terms and vocabulary for a project.",
  },
  {
    title: "Don't Think Outside the Box – Find the Box",
    description:
      'When faced with an impossible problem, identify the real constraints. Ask yourself: "Does it have to be done this way? Does it have to be done at all?"',
  },
  {
    title: "Start When You're Ready.",
    description:
      "You've been building experience all your life. Don't ignore niggling doubts.",
  },
  {
    title: "Some Things Are Better Done than Described",
    description:
      "Don't fall into the specification spiral – at some point you need to start coding.",
  },
  {
    title: "Don't Be a Slave to Formal Methods.",
    description:
      "Don't blindly adopt any technique without putting it into the context of your development practices and capabilities.",
  },
  {
    title: "Costly Tools Don't Produce Better Designs",
    description:
      "Beware of vendor hype, industry dogma, and the aura of the price tag. Judge tools on their merits.",
  },
  {
    title: "Organize Teams Around Functionality",
    description:
      "Don't separate designers from coders, testers from data modelers. Build teams the way you build code.",
  },
  {
    title: "Don't Use Manual Procedures",
    description:
      "A shell script or batch file will execute the same instructions, in the same order, time after time.",
  },
  {
    title: "Test Early. Test Often. Test Automatically",
    description:
      "Tests that run with every build are much more effective than test plans that sit on a shelf.",
  },
  {
    title: "Coding Ain't Done 'Til All the Tests Run",
    description: "'Nuff said.",
  },
  {
    title: "Use Saboteurs to Test Your Testing",
    description:
      "Introduce bugs on purpose in a separate copy of the source to verify that testing will catch them.",
  },
  {
    title: "Test State Coverage, Not Code Coverage",
    description:
      "Identify and test significant program states. Just testing lines of code isn't enough.",
  },
  {
    title: "Find Bugs Once",
    description:
      "Once a human tester finds a bug, it should be the last time a human tester finds that bug. Automatic tests should check for it from then on.",
  },
  {
    title: "English is Just a Programming Language",
    description:
      "Write documents as you would write code: honor the DRY principle, use metadata, MVC, automatic generation, and so on.",
  },
  {
    title: "Build Documentation In, Don't Bolt It On",
    description:
      "Documentation created separately from code is less likely to be correct and up to date.",
  },
  {
    title: "Gently Exceed Your Users' Expectations",
    description:
      "Come to understand your users' expectations, then deliver just that little bit more.",
  },
  {
    title: "Sign Your Work",
    description:
      "Craftsmen of an earlier age were proud to sign their work. You should be, too.",
  },
];

export default quotes;
