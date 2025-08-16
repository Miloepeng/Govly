import streamlit as st

st.set_page_config(page_title="Application Status Tracker", page_icon="📄")

st.title("📄 Application Status Tracker")

# Example data
forms_data = {
    "Land Ownership Confirmation Form": {
        "stages": ["Submitted", "Processing", "Approved"],
        "current_stage": 1
    },
    "House Ownership Verification Form": {
        "stages": ["Submitted", "Under Review", "Rejected"],
        "current_stage": 0
    },
    "House Ownership Confirmation Form": {
        "stages": ["Submitted", "Verification", "Completed"],
        "current_stage": 2
    }
}

# CSS
st.markdown("""
<style>
.timeline-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 30px 0;
}
.stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex: 1;
}
.stage-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    z-index: 2;
}
.red { background-color: #F44336; }
.yellow { background-color: #FFC107; }
.green { background-color: #4CAF50; }
.grey { background-color: #BDBDBD; }
.stage-label {
    margin-top: 8px;
    font-size: 0.9em;
    text-align: center;
}
.stage-line {
    position: absolute;
    top: 10px;
    left: 50%;
    right: -50%;
    height: 4px;
    z-index: 1;
}
.line-green { background-color: #4CAF50; }
.line-yellow { background-color: #FFC107; }
.line-grey { background-color: #BDBDBD; }
.stage:last-child .stage-line {
    display: none;
}
</style>
""", unsafe_allow_html=True)

# Render timelines
for form_name, form_info in forms_data.items():
    stages = form_info["stages"]
    current_stage = form_info["current_stage"]

    st.subheader(form_name)

    html_timeline = '<div class="timeline-container">'
    for i, stage_name in enumerate(stages):
        # Dot color
        if i > current_stage:
            color_class = "grey"
        elif i == 0:
            color_class = "red"
        elif i == len(stages) - 1:
            color_class = "green"
        else:
            color_class = "yellow"

        # Line color
        if i < len(stages) - 1:
            if current_stage == len(stages) - 1:  # fully completed form
                line_class = "line-green"
            elif i < current_stage - 1:  # two completed stages
                line_class = "line-green"
            elif i == current_stage - 1:  # current stage to next
                line_class = "line-yellow"
            elif i >= current_stage:  # future stages
                line_class = "line-grey"
        else:
            line_class = ""

        html_timeline += f'<div class="stage"><div class="stage-dot {color_class}"></div><div class="stage-label">{stage_name}</div>'
        if line_class:
            html_timeline += f'<div class="stage-line {line_class}"></div>'
        html_timeline += '</div>'
    html_timeline += "</div>"

    st.markdown(html_timeline, unsafe_allow_html=True)

st.page_link("streamlit_app.py", label="⬅️ Back to Chat")
