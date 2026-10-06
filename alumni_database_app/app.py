"""
Alumni Database Querier
------------------------
A simple, portable Streamlit web app for storing, querying, and
analyzing alumni engagement survey data.

Run with:
    streamlit run app.py

Data is stored locally in a SQLite database file (alumni_database.db)
that is created automatically on first run - no external database
server required. See db.py for the data layer.
"""

import os

import pandas as pd
import streamlit as st

import db

st.set_page_config(page_title="Alumni Database Querier", page_icon="🎓", layout="wide")

db.init_db()

if "authenticated_user" not in st.session_state:
    if not db.bootstrap_admin():
        user_count = int(db.run_query(f"SELECT COUNT(*) AS c FROM {db.USER_TABLE_NAME}").iloc[0]["c"])
        if user_count == 0:
            st.error(
                "No login account exists yet. Configure BOOTSTRAP_ADMIN_USERNAME, "
                "BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD in your deployment secrets. "
                "Use a password with at least 12 characters."
            )
            st.stop()

    st.title("🎓 Alumni Database | Sign In")
    with st.form("login_form"):
        identity = st.text_input("Username or email")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Sign in", type="primary", use_container_width=True)

    if submitted:
        account = db.authenticate_user(identity, password)
        if account:
            st.session_state["authenticated_user"] = account
            st.rerun()
        st.error("Sign-in failed. Check your username/email and password.")
    st.stop()

st.title("🎓 Alumni Database Querier")
st.caption("Search, filter, and analyze alumni engagement survey responses.")

with st.sidebar:
    st.caption(f"Signed in as **{st.session_state['authenticated_user']['username']}**")
    if st.button("Sign out", use_container_width=True):
        del st.session_state["authenticated_user"]
        st.rerun()

page = st.sidebar.radio(
    "Navigate",
    ["🔍 Search & Filter", "📊 Analytics", "📋 View All Data", "📤 Upload / Ingest CSV", "⚙️ Settings"],
)

total_count = db.run_query(f"SELECT COUNT(*) as c FROM {db.TABLE_NAME}").iloc[0]["c"]

# ---------------- Search & Filter ----------------
if page == "🔍 Search & Filter":
    st.header("Search & Filter Alumni")

    if total_count == 0:
        st.info("No data yet. Go to **📤 Upload / Ingest CSV** to add alumni records.")
    else:
        col1, col2, col3 = st.columns(3)
        with col1:
            name_search = st.text_input("Name contains (first or last)")
            company_search = st.text_input("Current company contains")
        with col2:
            majors = db.get_distinct_values("major")
            selected_majors = st.multiselect("Major", options=majors)
            linkedin_filter = st.selectbox("Has LinkedIn profile?", ["Any", "Yes", "No"])
        with col3:
            year_mode = st.radio("Graduation year", ["Any", "Specific year", "Range"], horizontal=True)
            specific_year, year_min, year_max = None, None, None
            if year_mode == "Specific year":
                specific_year = st.number_input("Year", min_value=1950, max_value=2100, value=2024, step=1)
            elif year_mode == "Range":
                yc1, yc2 = st.columns(2)
                year_min = yc1.number_input("From", min_value=1950, max_value=2100, value=2020, step=1)
                year_max = yc2.number_input("To", min_value=1950, max_value=2100, value=2025, step=1)

        question_cols = db.get_question_columns()
        q_filters = {}
        if question_cols:
            st.markdown("**Questionnaire filters**")
            q_cols_ui = st.columns(min(4, len(question_cols)))
            for i, qcol in enumerate(question_cols):
                with q_cols_ui[i % len(q_cols_ui)]:
                    q_filters[qcol] = st.selectbox(db.question_label(qcol), ["Any", "Yes", "No"], key=f"filt_{qcol}")

        clauses, params = [], {}
        if name_search:
            clauses.append("(LOWER(first_name) LIKE :name OR LOWER(last_name) LIKE :name)")
            params["name"] = f"%{name_search.lower()}%"
        if company_search:
            clauses.append("LOWER(current_company) LIKE :company")
            params["company"] = f"%{company_search.lower()}%"
        if selected_majors:
            major_keys = []
            for i, m in enumerate(selected_majors):
                key = f"major_{i}"
                major_keys.append(f":{key}")
                params[key] = m
            clauses.append(f"major IN ({', '.join(major_keys)})")
        if linkedin_filter == "Yes":
            clauses.append("linked_in IS NOT NULL AND linked_in != ''")
        elif linkedin_filter == "No":
            clauses.append("(linked_in IS NULL OR linked_in = '')")
        if year_mode == "Specific year" and specific_year:
            clauses.append("graduation_year = :year")
            params["year"] = int(specific_year)
        elif year_mode == "Range" and year_min and year_max:
            clauses.append("graduation_year BETWEEN :ymin AND :ymax")
            params["ymin"] = int(year_min)
            params["ymax"] = int(year_max)
        for qcol, val in q_filters.items():
            if val != "Any":
                key = f"filt_val_{qcol}"
                clauses.append(f'"{qcol}" = :{key}')
                params[key] = val

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM {db.TABLE_NAME} {where_sql} ORDER BY last_name, first_name"
        results = db.run_query(sql, params)

        st.markdown(f"**{len(results)} result(s) found** (of {total_count} total)")
        st.dataframe(results.drop(columns=["id"], errors="ignore"), use_container_width=True)

        if not results.empty:
            csv_bytes = results.drop(columns=["id"], errors="ignore").to_csv(index=False).encode("utf-8")
            st.download_button("⬇️ Download results as CSV", csv_bytes, "alumni_search_results.csv", "text/csv")

# ---------------- Analytics ----------------
elif page == "📊 Analytics":
    st.header("Analytics Overview")

    if total_count == 0:
        st.info("No data yet. Go to **📤 Upload / Ingest CSV** to add alumni records.")
    else:
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Alumni", int(total_count))
        distinct_companies = db.run_query(
            f"SELECT COUNT(DISTINCT current_company) as c FROM {db.TABLE_NAME}"
        ).iloc[0]["c"]
        col2.metric("Distinct Companies", int(distinct_companies))
        distinct_majors = db.run_query(f"SELECT COUNT(DISTINCT major) as c FROM {db.TABLE_NAME}").iloc[0]["c"]
        col3.metric("Distinct Majors", int(distinct_majors))

        st.subheader("Graduation Year Distribution")
        grad_df = db.run_query(
            f"SELECT graduation_year, COUNT(*) as count FROM {db.TABLE_NAME} "
            "GROUP BY graduation_year ORDER BY graduation_year"
        )
        if not grad_df.empty:
            st.bar_chart(grad_df.set_index("graduation_year"))

        st.subheader("Questionnaire Response Rates")
        question_cols = db.get_question_columns()
        for qcol in question_cols:
            dist = db.run_query(f'SELECT "{qcol}" as answer, COUNT(*) as count FROM {db.TABLE_NAME} GROUP BY "{qcol}"')
            with st.expander(db.question_label(qcol)):
                if not dist.empty:
                    st.bar_chart(dist.set_index("answer"))
                else:
                    st.write("No responses yet.")

        st.subheader("Top Companies")
        top_companies = db.run_query(
            f"SELECT current_company, COUNT(*) as count FROM {db.TABLE_NAME} "
            "WHERE current_company IS NOT NULL AND current_company != '' "
            "GROUP BY current_company ORDER BY count DESC LIMIT 10"
        )
        if not top_companies.empty:
            st.bar_chart(top_companies.set_index("current_company"))

        st.subheader("Top Majors")
        top_majors = db.run_query(
            f"SELECT major, COUNT(*) as count FROM {db.TABLE_NAME} "
            "WHERE major IS NOT NULL AND major != '' "
            "GROUP BY major ORDER BY count DESC LIMIT 10"
        )
        if not top_majors.empty:
            st.bar_chart(top_majors.set_index("major"))

# ---------------- View All Data ----------------
elif page == "📋 View All Data":
    st.header("All Alumni Records")
    df = db.run_query(f"SELECT * FROM {db.TABLE_NAME} ORDER BY last_name, first_name")
    st.markdown(f"**{len(df)} total record(s)**")
    st.dataframe(df.drop(columns=["id"], errors="ignore"), use_container_width=True)
    if not df.empty:
        csv_bytes = df.drop(columns=["id"], errors="ignore").to_csv(index=False).encode("utf-8")
        st.download_button("⬇️ Download all data as CSV", csv_bytes, "alumni_all_data.csv", "text/csv")

# ---------------- Upload ----------------
elif page == "📤 Upload / Ingest CSV":
    st.header("Upload / Ingest CSV")
    st.write(
        "Upload a CSV file to add or update alumni records. Matching is done by **email** - "
        "if an email already exists in the database its record is updated, otherwise a new "
        "record is created."
    )
    st.write(
        "Required column: `email`. Recommended columns: `first_name`, `last_name`, "
        "`current_company`, `graduation_year`, `major`, `linked_in`, plus any Yes/No "
        "questionnaire columns (name them starting with `q_`, e.g. `q_internship`). "
        "New questionnaire columns are added to the database automatically."
    )

    uploaded_file = st.file_uploader("Choose a CSV file", type=["csv"])
    if uploaded_file is not None:
        try:
            df = pd.read_csv(uploaded_file)
            st.write("Preview:")
            st.dataframe(df.head(20), use_container_width=True)
            if st.button("Ingest this file into the database", type="primary"):
                inserted, updated, skipped = db.ingest_dataframe(df)
                msg = f"Done! {inserted} new record(s) added, {updated} existing record(s) updated."
                if skipped:
                    msg += f" {skipped} row(s) skipped (missing email)."
                st.success(msg)
                st.rerun()
        except Exception as e:
            st.error(f"Could not process file: {e}")

    st.divider()
    st.subheader("Or load the included sample / demo dataset")
    if st.button("Load sample_alumni_data.csv"):
        sample_path = os.path.join(db.APP_DIR, "sample_alumni_data.csv")
        if os.path.exists(sample_path):
            df = pd.read_csv(sample_path)
            inserted, updated, skipped = db.ingest_dataframe(df)
            st.success(f"Sample data loaded! {inserted} new record(s) added, {updated} updated.")
            st.rerun()
        else:
            st.error("sample_alumni_data.csv not found next to app.py.")

# ---------------- Settings ----------------
elif page == "⚙️ Settings":
    st.header("Settings")
    st.write(f"Database file location: `{db.DB_PATH}`")
    st.write("Current columns in the alumni table:")
    st.code(", ".join(db.get_table_columns()))
    st.caption(
        "Any column beyond the base fields is treated as a Yes/No questionnaire question "
        "and will automatically show up as a filter and a chart."
    )

    st.divider()
    st.subheader("⚠️ Danger zone")
    st.write("This permanently deletes all data in the database (the file itself stays).")
    confirm = st.checkbox("I understand this cannot be undone")
    if st.button("Reset / clear all data", disabled=not confirm):
        with db.ENGINE.begin() as conn:
            conn.execute(db.text(f"DELETE FROM {db.TABLE_NAME}"))
        st.success("All data cleared.")
        st.rerun()
