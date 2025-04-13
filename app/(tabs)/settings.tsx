import { OtpDataContext } from '@/context/OtpDataContext';
import { FileHandler } from '@/utils/fileHandler';
import { useContext } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Settings() {
    const context = useContext(OtpDataContext);
    if (!context)
        return (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} ><Text style={{ color: 'red' }}>Unable to load context? Contact the developer</Text></View>);


    return (
        <View style={styles.container}>
            <Button title='Erase Data' onPress={() => FileHandler.removeData()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
