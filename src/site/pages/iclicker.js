// pages/iclicker.js — PROJECT 03
//
// THE ARGUMENT
// ------------
// This is not a page about beating a class and it must never read as one. The
// helper it comes from was built and run with the course instructor's knowledge
// for CPEN 396 at UBC, where the graded participation instrument is in-class
// hand-raises and the polls are an engagement signal. That the instructor said
// yes is itself part of the finding: everyone already knows the metric is soft.
//
// The finding is about the INSTITUTION. An industry-standard, officially adopted
// attendance system asks the machine being measured to grade itself, hands that
// machine the answer to its own check, and then everyone agrees to call the
// output attendance. Nothing here is an undisclosed vulnerability; all of it is
// visible in the client the system ships to every student on day one.
//
// THE OBJECT
// ----------
// The same object as the home sheet: white stock, die-cut, with the two-ink
// print behind it. Nothing new was invented to hold a project. The apertures
// are the home sheet's own trims and they support the page; what carries it is
// the evidence — the system's own response, and captures of the system running.
//
// The second ink is a verdigris: the cool end of the site's three-step run of
// second inks, held well clear of the sheet's own blue so the two can never
// read as one wash.

import { capture, mountMedia } from "../media.js";

export function html(p) {
  const inkName = (p?.inkName || "VERDIGRIS").replace(/ /g, "&nbsp;");
  return `
  <!-- ══ 00 · THE CLAIM ═══════════════════════════════════════════════════
       The home sheet's title composition and its trim: corners used, centre
       left alone, one tall slot right of centre holding the print. -->
  <section class="plate" id="p0">
    <div class="corner tl">
      <p class="t">PROJECT&nbsp;03&nbsp;—&nbsp;ICLICKER</p>
      <p class="t dim">SECURITY&nbsp;·&nbsp;CASE&nbsp;STUDY<br />CLASSROOM&nbsp;PARTICIPATION</p>
    </div>
    <div class="corner tr">
      <p class="t dim"><span data-at>—</span></p>
      <p class="t">2025</p>
    </div>

    <div class="ap tall" data-ap data-collider style="--x:57%; --y:12%; --w:25%; --h:64%"></div>
    <p class="t dim cap" style="--x:57%; --y:78%">PL.&nbsp;03&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}</p>

    <div class="corner bl">
      <h1 class="d" data-collider style="max-width:19ch">a mark that<br />anything can make<br /><em>is not attendance</em></h1>
    </div>
    <div class="corner br">
      <p class="t dim">FIVE&nbsp;PLATES.&nbsp;NO&nbsp;METHOD&nbsp;IS&nbsp;PUBLISHED&nbsp;HERE.</p>
      <p class="t">SCROLL&nbsp;↓</p>
    </div>
  </section>

  <!-- ══ 01 · THE CHECK ═══════════════════════════════════════════════════
       Three claims and what answers for them. The third row is empty, and the
       emptiness is the finding. -->
  <section class="plate" id="p1">
    <div class="corner tl">
      <p class="t">01&nbsp;—&nbsp;THE&nbsp;CHECK</p>
      <p class="t dim">WHAT&nbsp;IT&nbsp;CLAIMS,&nbsp;AND&nbsp;WHAT&nbsp;ANSWERS&nbsp;FOR&nbsp;IT</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="checks" data-collider>
      <div class="check">
        <dt>CLAIM</dt><dd class="claim">“the student is in the classroom”</dd>
        <dt>ANSWERED&nbsp;BY</dt><dd>NAVIGATOR.GEOLOCATION</dd>
        <dt>RUNS&nbsp;ON</dt><dd>THE&nbsp;STUDENT'S&nbsp;OWN&nbsp;MACHINE</dd>
      </div>
      <div class="check">
        <dt>CLAIM</dt><dd class="claim">“the student answered the poll”</dd>
        <dt>ANSWERED&nbsp;BY</dt><dd>AN&nbsp;EVENT&nbsp;ON&nbsp;A&nbsp;BUTTON</dd>
        <dt>RUNS&nbsp;ON</dt><dd>THE&nbsp;STUDENT'S&nbsp;OWN&nbsp;MACHINE</dd>
      </div>
      <div class="check none">
        <dt>CLAIM</dt><dd class="claim">“the student was there, and awake”</dd>
        <dt>ANSWERED&nbsp;BY</dt><dd>—</dd>
        <dt>RUNS&nbsp;ON</dt><dd>—</dd>
      </div>
      <p class="t dim body wide">A browser API is not a sensor. It is a question
        the page asks the page. Both checks above are answered by the party they
        are checking, and everything after this is detail.</p>
    </div>

    ${capture({
      id: "iclicker-poll",
      pos: "--x:53%; --y:24%; --w:35%",
      ratio: "4 / 3",
      cap: "FIG. 1 — THE POLL, AS A STUDENT SEES IT.",
      alt: "The iClicker student poll screen"
    })}
  </section>

  <!-- ══ 02 · THE COORDINATE ══════════════════════════════════════════════
       The one that is genuinely startling, and then the turn. The dialog is
       the home sheet's own chrome, reused: the true thing said inside system
       furniture (RYAN.txt IV). -->
  <section class="plate" id="p2">
    <div class="corner tl">
      <p class="t">02&nbsp;—&nbsp;THE&nbsp;COORDINATE</p>
      <p class="t dim">THE&nbsp;ANSWER,&nbsp;SENT&nbsp;BEFORE&nbsp;THE&nbsp;QUESTION</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="spec wide-col" data-collider>
      <div class="doc">{ "session": {<br />
&nbsp;&nbsp;"id": "…", "state": "RUNNING",<br />
&nbsp;&nbsp;<span class="ring">"instructorLocation": { "lat": …, "lon": … }</span><br />
} }</div>
      <p class="t dim body wide">Returned to the client when a student joins. The
        check is “are you near the instructor”. The instructor's coordinates are
        in the response.</p>
      <p class="t dim body wide">Not a mistake in a line of code — it is what
        happens when a check is designed to run somewhere the thing being checked
        is in charge. The client needs a target to compare against, so the target
        has to be shipped, and once it is shipped the check is over.</p>
      <p class="t dim body wide">Nothing about this is hidden. It is in the
        response body of the first request the client makes, readable in any
        browser's network panel by anyone who thinks to look.</p>
    </div>

    <div class="side">
      <div class="dialog inline">
        <p class="dlg-bar">SYSTEM</p>
        <div class="dlg-body one">
          <div class="dlg-text">
            <p class="d sm">your participation<br /><em>has been recorded</em></p>
            <p class="t body wide">It has not been observed.</p>
          </div>
        </div>
      </div>
      <div>
        <p class="t dim">SECONDS&nbsp;SPENT&nbsp;ESTABLISHING<br />THAT&nbsp;A&nbsp;PERSON&nbsp;WAS&nbsp;PRESENT</p>
        <p class="t body">Zero. There is no step in the exchange at which a
          person is established. There is a device, a coordinate the device was
          given, and a button event the device reports.</p>
      </div>
    </div>
  </section>

  <!-- ══ 03 · WHAT IT LOOKS LIKE ══════════════════════════════════════════
       The evidence, as captures. A case study whose evidence is a drawing is
       not a case study. -->
  <section class="plate" id="p3">
    <div class="corner tl">
      <p class="t">03&nbsp;—&nbsp;WHAT&nbsp;IT&nbsp;LOOKS&nbsp;LIKE</p>
      <p class="t dim">THE&nbsp;SYSTEM'S&nbsp;OWN&nbsp;CLIENT,&nbsp;UNMODIFIED</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    ${capture({
      id: "iclicker-response",
      pos: "--x:var(--pad); --y:24%; --w:min(44ch,42vw)",
      ratio: "16 / 10",
      cap: "FIG. 2 — THE JOIN RESPONSE, IN THE NETWORK PANEL.",
      alt: "The session join response shown in a browser network panel"
    })}

    ${capture({
      id: "iclicker-map",
      pos: "--x:53%; --y:24%; --w:35%",
      ratio: "16 / 10",
      cap: "FIG. 3 — THE GEOFENCE THE CLIENT IS ASKED TO CHECK ITSELF AGAINST.",
      alt: "The geofence around the instructor's coordinate"
    })}

    <div class="corner br">
      <p class="t dim">CAPTURES&nbsp;ARE&nbsp;OF&nbsp;THE&nbsp;SHIPPED&nbsp;CLIENT.<br />NOTHING&nbsp;HERE&nbsp;WAS&nbsp;PATCHED&nbsp;TO&nbsp;PRODUCE&nbsp;THEM.</p>
    </div>
  </section>

  <!-- ══ 04 · DISCLOSURE ══════════════════════════════════════════════════ -->
  <section class="plate" id="p4">
    <div class="corner tl"><p class="t">04&nbsp;—&nbsp;DISCLOSURE</p></div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="cols" data-collider>
      <div><p class="t dim">FRAMING</p><p class="t body">A study of a system, not
        a method for defeating one. No procedure is published here.</p></div>
      <div><p class="t dim">CONSENT</p><p class="t body">Built and run with the
        course instructor's knowledge for CPEN 396. Graded participation there is
        in-class hand-raises; the polls are an engagement signal.</p></div>
      <div><p class="t dim">NOVELTY</p><p class="t body">None claimed. All of it
        is observable in the client the system ships to every student on the
        first day.</p></div>
      <div><p class="t dim">WHY&nbsp;IT&nbsp;MATTERS</p><p class="t body">Not that
        one student can produce a mark. That a standardised system is trusted at
        institutional scale while resting on a check it cannot make.</p></div>
    </div>

    <div class="ap band" data-ap style="--x:0%; --y:69%; --w:100%; --h:14%"></div>
    <p class="t dim cap pad" style="--y:84.5%">PL.&nbsp;03&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}.</p>

    <div class="corner br">
      <p class="t"><a class="link" href="/" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;sheet</a></p>
    </div>
  </section>`;
}

export function mount({ scope }) {
  mountMedia(scope);
}
