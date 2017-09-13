import pandas as pd
from scipy.cluster.vq import kmeans, vq
from collections import Counter
import random
import copy
# from matplotlib import pyplot
from sklearn.preprocessing import StandardScaler
import numpy as np
from sklearn.decomposition import PCA
from flask import Flask, render_template
import calendar
import json
import jsonpickle

PORT = 3000
app = Flask(__name__)
path = 'static/data/'


def fill_na(df):
    date = df['date']
    time = df['time']
    del df['date']
    del df['time']
    df = df.astype(float)
    df += 1
    df['date'] = date
    df['time'] = time
    df = df.fillna(0)
    df_samples = copy.deepcopy(df)
    del df['date']
    del df['time']
    return df, df_samples


def get_data(file):
    df = pd.read_csv(file, sep=',', error_bad_lines=False, index_col=False, dtype='unicode')
    return df


def clean_data(df):
    # drop columns with Nan values greater than 10k
    df = df.dropna(thresh=len(df)-10000, axis=1)
    del df['accident_index']
    del df['local_authority_(highway)']
    for column in df:
        if any(df[column] == '-1'):
            missing_values_count = df[column].value_counts()["-1"]
            # drop columns with -1 values greater than 10k
            if missing_values_count > 100000:
                del df[column]
    df, df_samples = fill_na(df)
    #df_samples['time'] = df_samples['time'].str.split(' ').str[-1]
    return df, df_samples


# def plot_elbow_data(initial):
#     pyplot.plot([var for (cent, var) in initial])
#     pyplot.title('Obtaining K value through Elbow Method')
#     pyplot.xlabel('Number of clusters')
#     pyplot.ylabel('Objective function')
#     pyplot.show()


def stratified_sampling(df, df_samples):
    samples = df.astype(float)
    initial = kmeans(samples, 4)
    # initial = [kmeans(samples, i) for i in range(1, 10)]

    # plot_elbow_data(initial)
    # data = np.array([distortion for (codebook, distortion) in initial])
    # kmeans_data = pd.DataFrame(data.reshape(-1, 1), columns=["Objective_function"])
    # kmeans_data["K"] = range(1, 10)
    # kmeans_data.to_csv(path+'kmeans_data.csv', sep=',')
    # codebook, distortion = initial[4]

    codebook, distortion = initial
    code, dist = vq(samples, codebook)
    counter = Counter(code)

    indices = []
    for mark in set(code):
        index_mark = {k: v for k, v in enumerate(code) if v == mark}
        indices.extend(random.sample(list(index_mark), int(counter[mark] * 0.4)))
    stratified_samples = samples.ix[indices]
    samples = df_samples.ix[indices]
    samples.to_csv(path+'stratified_samples.csv', sep=',')
    return samples, stratified_samples


def get_intrinsic_dimension(df_samples):
    standardized_samples = StandardScaler().fit_transform(df_samples).T
    correlation_matrix = np.corrcoef(standardized_samples)
    eigen_values, eigen_vectors = np.linalg.eigh(correlation_matrix)

    # scree_plot_data = pd.DataFrame(eigen_values, columns=["Eigen_values"])
    # scree_plot_data["PCA_Component"] = range(1, len(df_samples.columns) + 1)
    # scree_plot_data.to_csv(path+'scree_plot_data.csv', sep=',')
    # pyplot.plot(eigen_values.sort(), '--o')
    # pyplot.axhline(y=1, color='b')
    # pyplot.axis('tight')
    # pyplot.xlabel('Number Of Components')
    # pyplot.ylabel('Eigen Values')
    # pyplot.title('Eigen Values Vs Number Of Components')
    # pyplot.show()

    intrinsic_dimension = (eigen_values >= 1).sum()
    return intrinsic_dimension


def get_squared_loadings(samples, dimension, loading_num):
    pca = PCA(n_components=dimension)
    pca.fit_transform(StandardScaler().fit_transform(samples))
    loadings = np.array(pca.components_).transpose()

    # squared_pca_loadings = []
    # for i in pca.components_.T:
    #     squared_pca_loadings.append(np.sqrt(np.sum(np.square(i))))
    # np_array = np.array(squared_pca_loadings)
    # feature_index = np_array.argsort()[-3:][::-1]
    # features = list(np.array(categories).take(feature_index))
    # return {
    #     "pca_squared_loadings": squared_pca_loadings,
    #     "features": features,
    #     "data_projections": projections_data
    # }


    squared_loadings = np.sqrt(np.sum(np.square(loadings), axis=1))
    squared_loadings_data = pd.DataFrame(squared_loadings, columns=["Squared_loadings"])
    squared_loadings_data["Attributes"] = pd.DataFrame(samples).columns
    squared_loadings_data = squared_loadings_data.sort_values(["Squared_loadings"], ascending=[False])

    squared_loadings_data.to_csv(path+'squared_loadings_data.csv', sep=',')
    #df['light_conditions'] = df['light_conditions'].astype(float).astype(int)

    max_loading = squared_loadings_data[0:loading_num]['Attributes'].values.tolist()
    print('max_loading : ',max_loading)

    samples.ix[:, max_loading].head(n=1000).astype(float).astype(int).to_csv(path+'top_squared_loadings.csv', sep=',')
    return max_loading


def interactive_day_of_week(stratified_samples):
    df = copy.deepcopy(stratified_samples)
    df['date_modified'] = df['date'].str.split('/').str[1]
    df = df.dropna(0)[['date_modified', 'day_of_week']].astype(int)

    look_up = {2: 'Sunday', 3: 'Monday', 4: 'Tuesday', 5: 'Wednesday', 6: 'Thursday', 7: 'Friday', 8: 'Saturday'}
    df['day_of_week'] = df['day_of_week'].apply(lambda x: look_up[x])

    grouped_data = df.groupby(['date_modified', 'day_of_week']).size().reset_index(name='val')
    grouped_data['date_modified'] = grouped_data['date_modified'].astype(int).apply(lambda x: calendar.month_abbr[x])
    grouped_data.groupby('date_modified', sort=False).apply(
        lambda x: x.set_index('day_of_week')['val'].to_dict()).to_json(path+'day_of_week.json')
    return


def bar_fatal_impact(stratified_samples):
    df = copy.deepcopy(stratified_samples)
    df['1st_point_of_impact'] = df['1st_point_of_impact'].astype(float).astype(int)
    df['accident_severity'] = df['accident_severity'].astype(float).astype(int)

    df = df[df['1st_point_of_impact'] != 0]
    df = df[df['accident_severity'] == 2]

    look_up1 = {1: 'Did not impact', 2: 'Front', 3: 'Back', 4: 'Offside', 5: 'Nearside'}
    df['1st_point_of_impact'] = df['1st_point_of_impact'].apply(lambda x: look_up1[x])

    look_up2 = {2: 'Fatal', 3: 'Serious', 4: 'Slight'}
    df['accident_severity'] = df['accident_severity'].apply(lambda x: look_up2[x])

    df = df.groupby('1st_point_of_impact').size().reset_index(name='value')
    df.to_csv(path+'bar_fata_impact.csv')
    return


def stacked_bar_chart(stratified_samples):
    df = copy.deepcopy(stratified_samples)
    df = df.dropna(0)[['age_band_of_driver', 'sex_of_driver']][df.age_band_of_driver != 0.0]
    df = df[df.sex_of_driver != 4.0][df.sex_of_driver != 0.0].astype(int)
    df['count'] = np.random.randn(len(df['sex_of_driver']))
    look_up = {2: 'male', 3: 'female'}
    df['sex_of_driver'] = df['sex_of_driver'].apply(lambda x: look_up[x])
    df['age_band_of_driver'] = df['age_band_of_driver'].astype(int).replace([2, 3], [4, 4])
    look_up = {4: '0-15', 5: '16-20', 6: '21-25', 7: '26-35', 8: '36-45', 9: '46-55',
               10: '56-65', 11: '66-75', 12: 'Over 75'}
    df['age_band_of_driver'] = df['age_band_of_driver'].apply(lambda x: look_up[x])

    df = df.groupby(['age_band_of_driver', 'sex_of_driver']).count()
    df = df.unstack(level=1)
    df.columns = df.columns.droplevel(level=0)
    df.to_csv(path + 'stacked_bar_chart_data.csv')
    return


def group_bar_chart_h_type_severity(stratified_samples):
    df = copy.deepcopy(stratified_samples)
    df['driver_home_area_type'] = df['driver_home_area_type'].astype(float).astype(int)
    df['accident_severity'] = df['accident_severity'].astype(float).astype(int)

    df = df[df['driver_home_area_type'] != 0]

    look_up1 = {2: 'Urban area', 3: 'Small Town', 4: 'Rural area'}
    df['driver_home_area_type'] = df['driver_home_area_type'].apply(lambda x: look_up1[x])

    look_up2 = {2: 'Fatal', 3: 'Serious', 4: 'Slight'}
    df['accident_severity'] = df['accident_severity'].apply(lambda x: look_up2[x])

    week_df = df.groupby(['driver_home_area_type','accident_severity']).size().reset_index(name='count')
    week_df['count'] = np.log(week_df['count'])

    print(week_df)
    with open(path+'group_bar_h_type.json', 'w') as f:
        data = []
        for index, key in enumerate(week_df['driver_home_area_type'].unique()):
            object = {}
            object['label'] = key
            for i, k in enumerate(week_df['driver_home_area_type']):
                if (key == k):
                    object[week_df['accident_severity'][i]] = int(week_df['count'][i])
            data.append(object)
        print(data)
        json_str = json.dumps(data)
        data = json.loads(json_str)
        # write to json file
        json.dump(data, f)


def do_nut_weather_fine_accident_severity(stratified_samples):
    df = copy.deepcopy(stratified_samples)
    df['weather_conditions'] = df['weather_conditions'].astype(float).astype(int)
    df['accident_severity'] = df['accident_severity'].astype(float).astype(int)

    df = df[df['weather_conditions'] != 0]
    df = df[df['weather_conditions'] == 2]

    look_up = {2: 'Fine no high winds', 3: 'Raining no high winds', 4: 'Snowing no high winds', 5: 'Fine + high winds',
               6: 'Raining + high winds', 7: 'Snowing + high wind', 8: 'Fog or mist', 9: 'Other'}
    df['weather_conditions'] = df['weather_conditions'].apply(lambda x: look_up[x])


    look_up2 = {2: 'Fatal', 3: 'Serious', 4: 'Slight'}
    df['accident_severity'] = df['accident_severity'].apply(lambda x: look_up2[x])

    df = df.groupby('accident_severity').size().reset_index(name='value')
    df.to_csv(path + 'do_nut_fine_slight.csv')
    return


def tree_map_district_weather_conditions(stratified_samples):
    # Top 5 highly populous districts (More than 500,000 inhabitants)
    district_id_to_name = {301: "Birmingham", 205: "Leeds", 216: "Sheffield", 597: "Cornwall", 201: "Bradford"}
    # Please Note: +1 has already been done from the xls
    district_ids = district_id_to_name.keys()

    df = copy.deepcopy(stratified_samples)
    #df['local_authority_(district)'] = df['local_authority_(district)'].astype(float).astype(int)
    df['weather_conditions'].replace([np.inf, -np.inf], np.nan)
    df['weather_conditions'].fillna(value=0)
    df['weather_conditions'] = df['weather_conditions'].astype(float).astype(int)

    df = df[df['weather_conditions'] != 0]
    df = df[df['weather_conditions'] != 10]


    look_up = {2 :'Fine no high winds', 3:'Raining no high winds', 4:'Snowing no high winds', 5:'Fine + high winds',
     6:'Raining + high winds', 7:'Snowing + high wind', 8:'Fog or mist', 9:'Other'}
    df['weather_conditions'] = df['weather_conditions'].apply(lambda x: look_up[x])


    with open(path+'treemap_speed.json', 'w') as f:
        data = []
        for district_id in district_ids:
            df_district = df[(df['local_authority_(district)'].isin([district_id]))]
            df_district = df_district[['weather_conditions']]
            a = df_district.groupby(['weather_conditions']).size().reset_index(name='count')
            for index,key in enumerate(a['weather_conditions']):
                object = {
                    "key": "UK",
                    "region": district_id_to_name[district_id],
                    "subregion": key,
                    "value": int(a['count'][index])
                }
                jsonpickle.encode(object)
                data.append(object)
        print(data)
        json_str = json.dumps(data)
        data = json.loads(json_str)
        # write to json file
        json.dump(data, f)


@app.route("/")
def index():
    return render_template('index.html')


def run():
    file = 'Kaagle_Upload.csv'
    df = get_data(file)
    df, df_c = clean_data(df)

    stratified_samples, df_samples = stratified_sampling(df, df_c)
    intrinsic_dimension = get_intrinsic_dimension(df_samples)
    get_squared_loadings(df_samples, intrinsic_dimension, 3)

    interactive_day_of_week(stratified_samples)
    do_nut_weather_fine_accident_severity(stratified_samples)
    bar_fatal_impact(stratified_samples)
    stacked_bar_chart(stratified_samples)
    tree_map_district_weather_conditions(stratified_samples)

    group_bar_chart_h_type_severity(stratified_samples)


if __name__ == "__main__":
    # run()
    app.run(host='0.0.0.0', port=PORT, debug=True)
    print("serving at port", PORT)
